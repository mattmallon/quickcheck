<?php

namespace App\Classes\ExternalData;
use Storage;
use ZipArchive;
use DOMDocument;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;
use App\Models\Assessment;
use App\Models\AnswerTypes\MCAnswer;
use App\Models\AnswerTypes\MatchingAnswer;
use App\Models\AnswerTypes\MatrixAnswer;
use App\Models\AnswerTypes\DropdownAnswer;
use App\Models\AnswerTypes\TextMatchAnswer;
use App\Models\AnswerTypes\NumericalAnswer;

class ExportQti {

    //parent directory for QTI exports for a user
    private $parentDirName = '';

    //directory where the export will live, inside user's parent directory
    private $qtiDirName = '';

    //directory where the zipped export is located, inside user's parent directory
    private $zipLocation = '';

    //location in storage where the unzipped QTI folder will temporarily live
    private $unzippedLocation = '';

    private $user;

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Master function to export, publicly available
    * Will return a path to the .zip to download
    *
    * @param  Request $request
    * @return string  $zipPath
    */

    public function export(Request $request)
    {
        $input = $request->all();
        $this->user = $request->user;
        $this->setDirNames();
        $assessmentIds = $input['assessments'];
        $assessments = [];

        foreach ($assessmentIds as $assessmentId) {
            $assessment = Assessment::find($assessmentId);
            array_push($assessments, $assessment);
        }

        $this->createManifest($assessments);

        foreach ($assessments as $assessment) {
            $this->createMetaFile($assessment);
            $this->createQtiFile($assessment);
        }

        $zipPath = $this->createZip();
        return $zipPath;
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Much easier to write one line for a function call than the 3 lines required
    * just to add a single attribute to an xml node...curse you, xml!
    *
    * @param  []  $assessments
    * @return void
    */

    private function addAttribute($doc, $attrName, $attrValue, $parent)
    {
        $newAttr = $doc->createAttribute($attrName);
        $newAttr->value = $attrValue;
        $parent->appendChild($newAttr);
    }

    /**
    * Add multiple choice options to an existing QTI XML item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  Question     $question
    * @return void
    */

    private function addMcOptions($doc, $item, $question)
    {
        $presentation = $item->getElementsByTagName('presentation')->item(0);
        $response_lid = $presentation->appendChild($doc->createElement('response_lid'));
        $this->addAttribute($doc, 'ident', 'response1', $response_lid);
        if ($question->question_type == 'multiple_choice') {
            $this->addAttribute($doc, 'rcardinality', 'Single', $response_lid);
        }
        else {
            $this->addAttribute($doc, 'rcardinality', 'Multiple', $response_lid);
        }
        $render_choice = $response_lid->appendChild($doc->createElement('render_choice'));
        $mcAnswers = MCAnswer::where('question_id', '=', $question->id)->get();
        $correctAnswer = null;
        foreach ($mcAnswers as $mcAnswer) {
            $response_label = $render_choice->appendChild($doc->createElement('response_label'));
            $this->addAttribute($doc, 'ident', $mcAnswer->id, $response_label);
            $material = $response_label->appendChild($doc->createElement('material'));
            $mattext = $material->appendChild($doc->createElement('mattext', htmlspecialchars($mcAnswer->answer_text)));
            $this->addAttribute($doc, 'texttype', 'text/plain', $mattext);
        }
    }

    /**
    * Indicate correctness of a multiple choice question in an XML item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  []           $mcAnswers
    * @return void
    */

    private function addMultChoiceCorrectness($doc, $item, $mcAnswers)
    {
        $resprocessing = $item->getElementsByTagName('resprocessing')->item(0);
        $correctAnswer = null;
        foreach ($mcAnswers as $mcAnswer) {
            if ($mcAnswer->correct == 'true') {
                $correctAnswer = $mcAnswer;
            }
        }
        $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
        $this->addAttribute($doc, 'continue', 'No', $respcondition);
        $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));
        $varequal = $conditionvar->appendChild($doc->createElement('varequal', $correctAnswer->id));
        $this->addAttribute($doc, 'respident', 'response1', $varequal);
        $setvar = $respcondition->appendChild($doc->createElement('setvar', '100'));
        $this->addAttribute($doc, 'action', 'Set', $setvar);
        $this->addAttribute($doc, 'varname', 'SCORE', $setvar);
    }

    /**
    * Indicate correctness of a multiple correct question in an XML item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  []           $mcAnswers
    * @return void
    */

    private function addMultCorrectCorrectness($doc, $item, $mcAnswers)
    {
        $resprocessing = $item->getElementsByTagName('resprocessing')->item(0);
        $correctAnswers = [];
        $incorrectAnswers = [];
        foreach ($mcAnswers as $mcAnswer) {
            if ($mcAnswer->correct == 'true') {
                array_push($correctAnswers, $mcAnswer);
            }
            else {
                array_push($incorrectAnswers, $mcAnswer);
            }
        }
        $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
        $this->addAttribute($doc, 'continue', 'No', $respcondition);
        $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));
        $and = $conditionvar->appendChild($doc->createElement('and'));
        foreach ($correctAnswers as $correctAnswer) {
            $varequal = $and->appendChild($doc->createElement('varequal', $correctAnswer->id));
            $this->addAttribute($doc, 'respident', 'response1', $varequal);
        }
        if (count($incorrectAnswers)) {
            $not = $and->appendChild($doc->createElement('not'));
            foreach ($incorrectAnswers as $incorrectAnswer) {
                $varequal = $not->appendChild($doc->createElement('varequal', $incorrectAnswer->id));
                $this->addAttribute($doc, 'respident', 'response1', $varequal);
            }
        }
    }

    /**
    * Add per-response feedback to a QTI XML Item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  []           $mcOptionFeedbackItems
    * @return void
    */

    private function addResponseFeedback($doc, $item, $mcOptionFeedbackItems)
    {
        foreach ($mcOptionFeedbackItems as $mcOptionFeedback) {
            $feedbackId = (string) $mcOptionFeedback->mc_answer_id . '_fb';
            //add the feedback text for each response item
            $itemfeedback = $item->appendChild($doc->createElement('itemfeedback'));
            $this->addAttribute($doc, 'ident', $feedbackId, $itemfeedback);
            $flow_mat = $itemfeedback->appendChild($doc->createElement('flow_mat'));
            $material = $flow_mat->appendChild($doc->createElement('material'));
            $mattext = $material->appendChild($doc->createElement('mattext', $mcOptionFeedback->feedback_text));
            $this->addAttribute($doc, 'texttype', 'text/plain', $mattext);

            //then link the responses to their feedback
            $resprocessing = $item->getElementsByTagName('resprocessing')->item(0);
            $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
            $this->addAttribute($doc, 'continue', 'Yes', $respcondition);
            $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));
            $varequal = $conditionvar->appendChild($doc->createElement('varequal', $mcOptionFeedback->mc_answer_id));
            $this->addAttribute($doc, 'respident', 'response1', $varequal);
            $displayfeedback = $respcondition->appendChild($doc->createElement('displayfeedback'));
            $this->addAttribute($doc, 'feedbacktype', 'Response', $displayfeedback);
            $this->addAttribute($doc, 'linkrefid', $feedbackId, $displayfeedback);
        }
    }

    /**
    * This is pretty much the same for every question; just saying to score
    * as a decimal for possible partial credit
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @return void
    */

    private function addScoringOutcome($doc, $item)
    {
        $resprocessing = $item->appendChild($doc->createElement('resprocessing'));
        $outcomes = $resprocessing->appendChild($doc->createElement('outcomes'));
        $decvar = $outcomes->appendChild($doc->createElement('decvar'));
        $this->addAttribute($doc, 'maxvalue', '100', $decvar);
        $this->addAttribute($doc, 'minvalue', '0', $decvar);
        $this->addAttribute($doc, 'varname', 'SCORE', $decvar);
        $this->addAttribute($doc, 'vartype', 'Decimal', $decvar);
    }

    /**
    * Add a QTI item to an existing XML doc
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode  $parent
    * @param  Question  $question
    * @return DOMNode $item
    */

    private function addQtiItem($doc, $parent, $question)
    {
        $item = $parent->appendChild($doc->createElement('item'));
        $this->addAttribute($doc, 'ident', $question->id, $item);
        $this->addAttribute($doc, 'title', 'Question', $item); //default Canvas question name

        //add the item's meta data
        $itemmetadata = $item->appendChild($doc->createElement('itemmetadata'));
        $qtimetadata = $itemmetadata->appendChild($doc->createElement('qtimetadata'));
        //question type
        $qtimetadatafield = $qtimetadata->appendChild($doc->createElement('qtimetadatafield'));
        $fieldlabel = $qtimetadatafield->appendChild($doc->createElement('fieldlabel', 'question_type'));
        $questionType = $this->convertQuestionTypeName($question->question_type);
        $fieldentry = $qtimetadatafield->appendChild($doc->createElement('fieldentry', $questionType));
        //points possible (default to 1 point per question)
        $qtimetadatafield = $qtimetadata->appendChild($doc->createElement('qtimetadatafield'));
        $fieldlabel = $qtimetadatafield->appendChild($doc->createElement('fieldlabel', 'points_possible'));
        $fieldentry = $qtimetadatafield->appendChild($doc->createElement('fieldentry', '1'));
        //identifier
        $qtimetadatafield = $qtimetadata->appendChild($doc->createElement('qtimetadatafield'));
        $fieldlabel = $qtimetadatafield->appendChild($doc->createElement('fieldlabel', 'assessment_question_identifierref'));
        $fieldentry = $qtimetadatafield->appendChild($doc->createElement('fieldentry', $question->id));

        //question text (note: for dropdowns, will make further alterations later to add in brackets, etc.)
        $presentation = $item->appendChild($doc->createElement('presentation'));
        $material = $presentation->appendChild($doc->createElement('material'));
        $mattext = $material->appendChild($doc->createElement('mattext', htmlspecialchars($question->question_text)));
        $this->addAttribute($doc, 'texttype', 'text/html', $mattext);

        return $item;
    }

    /**
    * Convert multiple dropdowns question into QTI XML item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  Question     $question
    * @return void
    */

    private function convertDropdownQuestion($doc, $item, $question)
    {
        //Canvas uses brackets in the text with variable names for each of the dropdowns,
        //which is totally different from what we do...so this will be fun.

        //add to question text the prompts, with bracketed variable names where the dropdowns go
        $dropdownPrompts = DropdownAnswer::where('question_id', '=', $question->id)
            ->where('prompt_or_answer', '=', 'prompt')
            ->get();

        $dropdownAnswers = DropdownAnswer::where('question_id', '=', $question->id)
            ->where('prompt_or_answer', '=', 'answer')
            ->get();

        $this->addScoringOutcome($doc, $item); //needed for all questions
        $presentation = $item->getElementsByTagName('presentation')->item(0); //append choices here later
        $mattext = $item->getElementsByTagName('mattext')->item(0); //append prompt text and vars here later
        $resprocessing = $item->getElementsByTagName('resprocessing')->item(0); //append feedback here later
        $questionText = $mattext->nodeValue; //get existing question text and add prompts/vars onto it
        $appendedText = '<p>';
        foreach ($dropdownPrompts as $dropdownPrompt) {
            //update question text with prompt and var name
            $appendedText .= htmlspecialchars($dropdownPrompt->answer_text);
            $varName = 'answer' . $dropdownPrompt->id;
            $appendedText .= ' [' . $varName . '] ';

            //update presentation tag so that each of the dropdown answers are identified as responses
            $response_lid = $presentation->appendChild($doc->createElement('response_lid'));
            $this->addAttribute($doc, 'ident', 'response_' . $varName, $response_lid);
            $material = $response_lid->appendChild($doc->createElement('material'));
            $mattext = $material->appendChild($doc->createElement('mattext', $varName));
            $render_choice = $response_lid->appendChild($doc->createElement('render_choice'));
            $correctAnswer = false;
            foreach ($dropdownAnswers as $dropdownAnswer) {
                $response_label = $render_choice->appendChild($doc->createElement('response_label'));
                //note: Canvas requires that each answer be uniquely identified, even if
                //the same answer text is being used across multiple prompts; so create
                //unique id based on prompt/answer id combination
                $this->addAttribute($doc, 'ident', $dropdownAnswer->id . $dropdownPrompt->id, $response_label);
                $material = $response_label->appendChild($doc->createElement('material'));
                $mattext = $material->appendChild($doc->createElement('mattext', htmlspecialchars($dropdownAnswer->answer_text)));
                $this->addAttribute($doc, 'texttype', 'text/plain', $mattext);

                if ($dropdownAnswer->answer_text == $dropdownPrompt->dropdown_answer_text) {
                    $correctAnswer = $dropdownAnswer;
                }
            }

            //update resprocessing so correct answer to this prompt is identified
            $partialCredit = 100 / count($dropdownPrompts);
            $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
            $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));
            $varequal = $conditionvar->appendChild($doc->createElement('varequal', $correctAnswer->id . $dropdownPrompt->id));
            $this->addAttribute($doc, 'respident', 'response_' . $varName, $varequal);
            $setvar = $respcondition->appendChild($doc->createElement('setvar', $partialCredit));
            $this->addAttribute($doc, 'varname', 'SCORE', $setvar);
            $this->addAttribute($doc, 'action', 'Add', $setvar);
        }

        $appendedText .= '</p>';
        //this variable was overwritten for question options, make sure we have the question text!
        $mattext = $item->getElementsByTagName('mattext')->item(0);
        $mattext->nodeValue = $questionText . $appendedText;
    }

    /**
    * Convert matching question in app to QTI XML item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  Question     $question
    * @return void
    */

    private function convertMatchingQuestion($doc, $item, $question)
    {
        //add scoring outcome (same for all questions)
        $this->addScoringOutcome($doc, $item);
        $resprocessing = $item->getElementsByTagName('resprocessing')->item(0);

        $matchingPrompts = MatchingAnswer::where('question_id', '=', $question->id)
            ->where('prompt_or_answer', '=', 'prompt')
            ->get();
        $matchingAnswers = MatchingAnswer::where('question_id', '=', $question->id)
            ->where('prompt_or_answer', '=', 'answer')
            ->get();

        $partialCreditPerResponse = 100 / count($matchingPrompts);
        $presentation = $item->getElementsByTagName('presentation')->item(0);
        foreach ($matchingPrompts as $matchingPrompt) {
            //add prompt and possible answers
            $response_lid  = $presentation->appendChild($doc->createElement('response_lid'));
            $responseId = 'response_' . $matchingPrompt->id;
            $this->addAttribute($doc, 'ident', $responseId, $response_lid);
            $material = $response_lid->appendChild($doc->createElement('material'));
            $mattext = $material->appendChild($doc->createElement('mattext', $matchingPrompt->option_text));
            $this->addAttribute($doc, 'texttype', 'text/plain', $mattext);
            $render_choice = $response_lid->appendChild($doc->createElement('render_choice'));

            $correctAnswer = false;
            foreach ($matchingAnswers as $matchingAnswer) {
                $response_label = $render_choice->appendChild($doc->createElement('response_label'));
                $this->addAttribute($doc, 'ident', $matchingAnswer->id, $response_label);
                $material = $response_label->appendChild($doc->createElement('material'));
                $mattext = $material->appendChild($doc->createElement('mattext', $matchingAnswer->option_text));

                if ($matchingPrompt->matching_answer_text == $matchingAnswer->option_text) {
                    $correctAnswer = $matchingAnswer;
                }
            }

            //add correctness
            $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
            $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));
            $varequal = $conditionvar->appendChild($doc->createElement('varequal', $correctAnswer->id));
            $this->addAttribute($doc, 'respident', $responseId, $varequal);
            $setvar = $respcondition->appendChild($doc->createElement('setvar', $partialCreditPerResponse));
            $this->addAttribute($doc, 'varname', 'SCORE', $setvar);
            $this->addAttribute($doc, 'action', 'Add', $setvar);
        }
    }

    /**
    * Convert matrix question within app to QTI XML item
    *
    * Because matrix questions are not supproted in Canvas, this converts a single
    * matrix question into several multiple choice questions
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  Question     $question
    * @param  DOMNode      $parent
    * @return void
    */

    private function convertMatrixQuestion($doc, $item, $question, $parent)
    {
        //at this point, a question has been created, but no options yet, so we need to...
        //1) Add the first matrix row as options and mark correctness
        //2) Create new multiple choice questions for each additional matrix row
        $matrixRows = MatrixAnswer::where('question_id', '=', $question->id)
            ->where('row_or_column', '=', 'row')
            ->get();

        $matrixColumns = MatrixAnswer::where('question_id', '=', $question->id)
            ->where('row_or_column', '=', 'column')
            ->get();

        $rowIndex = 0;
        for ($rowIndex = 0; $rowIndex < count($matrixRows); $rowIndex++) {
            if ($rowIndex > 0) {
                //the qti item with question text needs to be added for rows after the first;
                //since they all have the same question id, the ident attribute on the item
                //would be the same and thus all but the last item would be ignored by QTI, so
                //we need to alter the question id to make it unique each time we loop
                $question->id = $question->id . '-' . $rowIndex;
                $item = $this->addQtiItem($doc, $parent, $question);
            }
            //both the first row and additonal rows need the row text appended to the question
            //text and the columns to be converted to multiple choice options
            $mattext = $item->getElementsByTagName('mattext')->item(0);
            $questionText = $mattext->nodeValue;
            $rowText = '<p>' . $matrixRows[$rowIndex]->answer_text . ': </p>';
            $mattext->nodeValue = $questionText . $rowText;
            $this->convertMatrixOptionsToMc($doc, $item, $matrixRows[$rowIndex], $matrixColumns);
        }
    }

    /**
    * Within a single matrix question, convert each row to its own question
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  MatrixAnswer $matrixRow
    * @param  []           $matrixColumns
    * @return void
    */

    private function convertMatrixOptionsToMc($doc, $item, $matrixRow, $matrixColumns)
    {
        $presentation = $item->getElementsByTagName('presentation')->item(0);
        $response_lid = $presentation->appendChild($doc->createElement('response_lid'));
        $this->addAttribute($doc, 'ident', 'response1', $response_lid);
        $this->addAttribute($doc, 'rcardinality', 'Single', $response_lid);
        $render_choice = $response_lid->appendChild($doc->createElement('render_choice'));
        $correctAnswer = null;
        foreach ($matrixColumns as $matrixColumn) {
            $response_label = $render_choice->appendChild($doc->createElement('response_label'));
            $this->addAttribute($doc, 'ident', $matrixColumn->id, $response_label);
            $material = $response_label->appendChild($doc->createElement('material'));
            $mattext = $material->appendChild($doc->createElement('mattext', htmlspecialchars($matrixColumn->answer_text)));
            $this->addAttribute($doc, 'texttype', 'text/plain', $mattext);
            if ($matrixRow->matrix_answer_text == $matrixColumn->answer_text) {
                $correctAnswer = $matrixColumn;
            }
        }
        $this->addScoringOutcome($doc, $item);
        $resprocessing = $item->getElementsByTagName('resprocessing')->item(0);
        $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
        $this->addAttribute($doc, 'continue', 'No', $respcondition);
        $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));
        $varequal = $conditionvar->appendChild($doc->createElement('varequal', $correctAnswer->id));
        $this->addAttribute($doc, 'respident', 'response1', $varequal);
        $setvar = $respcondition->appendChild($doc->createElement('setvar', '100'));
        $this->addAttribute($doc, 'action', 'Set', $setvar);
        $this->addAttribute($doc, 'varname', 'SCORE', $setvar);
    }

    /**
    * Convert multiple choice question within app to QTI XML item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  Question     $question
    * @return void
    */

    private function convertMcQuestion($doc, $item, $question)
    {
        $this->addMcOptions($doc, $item, $question);
        $this->addScoringOutcome($doc, $item);

        //if applicable, add per-response feedback
        //NOTE: very important that this comes before correctness/incorrectness, since correct answer will
        //not be recognized in Canvas's QTI importer if tag for judging correctness comes before tag for
        //getting per-response feedback. Maybe something to do with the continue="No" attribute?
        $mcAnswers = MCAnswer::where('question_id', '=', $question->id)->get();
        $mcOptionFeedback = $mcAnswers[0]->McOptionFeedback;
        if ($mcOptionFeedback) {
            $mcOptionFeedbackItems = [];
            foreach ($mcAnswers as $mcAnswer) {
                array_push($mcOptionFeedbackItems, $mcAnswer->McOptionFeedback);
            }
            $this->addResponseFeedback($doc, $item, $mcOptionFeedbackItems);
        }

        if ($question->question_type == 'multiple_choice') {
            $this->addMultChoiceCorrectness($doc, $item, $mcAnswers);
        }
        else {
            $this->addMultCorrectCorrectness($doc, $item, $mcAnswers);
        }
    }


    /**
    * Convert numerical question to QTI XML item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  Question     $question
    * @return void
    */

    private function convertNumericalQuestion($doc, $item, $question)
    {
        //add the type of response needed (numerical)
        $presentation = $item->getElementsByTagName('presentation')->item(0);
        $response_str = $presentation->appendChild($doc->createElement('response_str'));
        $this->addAttribute($doc, 'ident', 'response1', $response_str);
        $this->addAttribute($doc, 'rcardinality', 'Single', $response_str);
        $render_fib = $response_str->appendChild($doc->createElement('render_fib'));
        $this->addAttribute($doc, 'fibtype', 'Decimal', $render_fib);
        $response_label = $render_fib->appendChild($doc->createElement('response_label'));
        $this->addAttribute($doc, 'ident', 'answer1', $response_label);

        //add correctness
        $this->addScoringOutcome($doc, $item); //needed for all questions
        $resprocessing = $item->getElementsByTagName('resprocessing')->item(0);
        $numericalAnswers = NumericalAnswer::where('question_id', '=', $question->id)->get();
        foreach ($numericalAnswers as $numericalAnswer) {
            $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
            $this->addAttribute($doc, 'continue', 'No', $respcondition);
            $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));

            if ($numericalAnswer->isExactAnswer()) {
                $answer = $numericalAnswer->numerical_answer;
                $marginOfError = $numericalAnswer->margin_of_error;

                $or = $conditionvar->appendChild($doc->createElement('or'));
                $varequal = $or->appendChild($doc->createElement('varequal', $answer));
                $this->addAttribute($doc, 'respident', 'response1', $varequal);

                $and = $or->appendChild($doc->createElement('and'));
                $vargte = $and->appendChild($doc->createElement('vargte', $answer - $marginOfError));
                $this->addAttribute($doc, 'respident', 'response1', $vargte);
                $varlte = $and->appendChild($doc->createElement('varlte', $answer + $marginOfError));
                $this->addAttribute($doc, 'respident', 'response1', $varlte);
            }
            else if($numericalAnswer->isRange()) {
                $rangeMin = $numericalAnswer->range_min;
                $rangeMax = $numericalAnswer->range_max;

                $vargte = $conditionvar->appendChild($doc->createElement('vargte', $rangeMin));
                $this->addAttribute($doc, 'respident', 'response1', $vargte);
                $varlte = $conditionvar->appendChild($doc->createElement('varlte', $rangeMax));
                $this->addAttribute($doc, 'respident', 'response1', $varlte);
            }

            $setvar = $respcondition->appendChild($doc->createElement('setvar', '100'));
            $this->addAttribute($doc, 'action', 'Set', $setvar);
            $this->addAttribute($doc, 'varname', 'SCORE', $setvar);
        }
    }

    /**
    * Convert question-level correct/incorrect feedback in the system to QTI
    *
    * @param  DOMDocument       $doc
    * @param  DOMNode           $item
    * @param  QuestionFeedback  $feedback
    * @return void
    */

    private function convertQuestionFeedback($doc, $item, $feedback)
    {
        //add correct/incorrect feedback text
        $correctFeedbackText = false;
        $incorrectFeedbackText = false;
        foreach ($feedback as $feedbackItem) {
            if ($feedbackItem->correct == 'true') {
                $correctFeedbackText = $feedbackItem->feedback_text;
            }
            else {
                $incorrectFeedbackText = $feedbackItem->feedback_text;
            }
        }
        $correctFeedback = $item->appendChild($doc->createElement('itemfeedback'));
        $this->addAttribute($doc, 'ident', 'correct_fb', $correctFeedback);
        $flow_mat = $correctFeedback->appendChild($doc->createElement('flow_mat'));
        $material = $flow_mat->appendChild($doc->createElement('material'));
        $mattext = $material->appendChild($doc->createElement('mattext', $correctFeedbackText));
        $this->addAttribute($doc, 'texttype', 'text/plain', $mattext);

        $incorrectFeedback = $item->appendChild($doc->createElement('itemfeedback'));
        $this->addAttribute($doc, 'ident', 'general_incorrect_fb', $incorrectFeedback);
        $flow_mat = $incorrectFeedback->appendChild($doc->createElement('flow_mat'));
        $material = $flow_mat->appendChild($doc->createElement('material'));
        $mattext = $material->appendChild($doc->createElement('mattext', $incorrectFeedbackText));
        $this->addAttribute($doc, 'texttype', 'text/plain', $mattext);


        //link correct feedback
        $resprocessing = $item->getElementsByTagName('resprocessing')->item(0);
        $respconditions = $resprocessing->getElementsByTagName('respcondition');
        foreach ($respconditions as $respcondition) {
            if ($respcondition->getAttribute('continue') == 'No') {
                $displayfeedback = $respcondition->appendChild($doc->createElement('displayfeedback'));
                $this->addAttribute($doc, 'feedbacktype', 'Response', $displayfeedback);
                $this->addAttribute($doc, 'linkrefid', 'correct_fb', $displayfeedback);
            }
        }

        //link incorrect feedback
        $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
        $this->addAttribute($doc, 'continue', 'Yes', $respcondition);
        $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));
        $other = $conditionvar->appendChild($doc->createElement('other'));
        $displayfeedback = $respcondition->appendChild($doc->createElement('displayfeedback'));
        $this->addAttribute($doc, 'feedbacktype', 'Response', $displayfeedback);
        $this->addAttribute($doc, 'linkrefid', 'general_incorrect_fb', $displayfeedback);
    }

    /**
    * Convert existing in-app question to QTI XML markup
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $parent
    * @param  Question     $question
    * @return void
    */

    private function convertQuestionToQti($doc, $parent, $question)
    {
        //create the item and its attributes
        $item = $this->addQtiItem($doc, $parent, $question);

        //response options
        switch ($question->question_type) {
            case 'multiple_choice':
            case 'multiple_correct':
                $this->convertMcQuestion($doc, $item, $question);
                break;
            case 'matching':
                $this->convertMatchingQuestion($doc, $item, $question);
                break;
            case 'matrix':
                $this->convertMatrixQuestion($doc, $item, $question, $parent);
                break;
            case 'dropdown':
                $this->convertDropdownQuestion($doc, $item, $question);
                break;
            case 'textmatch':
                $this->convertTextmatchQuestion($doc, $item, $question);
                break;
            case 'numerical':
                $this->convertNumericalQuestion($doc, $item, $question);
                break;
        }

        //question-level correct/incorrect feedback
        //note that feedback for matrix questions is removed, since they need to be split up
        //into several multiple choice questions (feedback for the matrix question as a whole
        //might not be applicable to each row individually)
        $feedback = $question->questionFeedback;
        if (count($feedback) && $question->question_type !== 'matrix') {
            $this->convertQuestionFeedback($doc, $item, $feedback);
        }
    }

    /**
    * Convert to make our question type names conform to QTI standard
    *
    * @param  string  $name
    * @return string  $convertedType
    */

    private function convertQuestionTypeName($name)
    {
        $convertedType = '';
        switch ($name) {
            case 'multiple_choice':
            case 'matrix':
                $convertedType = 'multiple_choice_question';
                break;
            case 'multiple_correct':
                $convertedType = 'multiple_answers_question';
                break;
            case 'textmatch':
                $convertedType = 'short_answer_question';
                break;
            case 'matching':
                $convertedType = 'matching_question';
                break;
            case 'dropdown':
                $convertedType = 'multiple_dropdowns_question';
                break;
            case 'numerical':
                $convertedType = 'numerical_question';
                break;
        }
        return $convertedType;
    }

    /**
    * Convert textmatch question into short answer QTI XML item
    *
    * @param  DOMDocument  $doc
    * @param  DOMNode      $item
    * @param  Question     $question
    * @return void
    */

    private function convertTextmatchQuestion($doc, $item, $question)
    {
        //add the type of response needed (fill in the blank)
        $presentation = $item->getElementsByTagName('presentation')->item(0);
        $response_str = $presentation->appendChild($doc->createElement('response_str'));
        $this->addAttribute($doc, 'ident', 'response1', $response_str);
        $this->addAttribute($doc, 'rcardinality', 'Single', $response_str);
        $render_fib = $response_str->appendChild($doc->createElement('render_fib'));
        $response_label = $render_fib->appendChild($doc->createElement('response_label'));
        $this->addAttribute($doc, 'ident', 'answer1', $response_label);
        $this->addAttribute($doc, 'rshuffle', 'No', $response_label);

        //add correctness
        $this->addScoringOutcome($doc, $item); //needed for all questions
        $resprocessing = $item->getElementsByTagName('resprocessing')->item(0);
        $respcondition = $resprocessing->appendChild($doc->createElement('respcondition'));
        $this->addAttribute($doc, 'continue', 'No', $respcondition);
        $conditionvar = $respcondition->appendChild($doc->createElement('conditionvar'));
        $textMatchAnswers = TextMatchAnswer::where('question_id', '=', $question->id)->get();
        foreach ($textMatchAnswers as $textMatchAnswer) {
            $varequal = $conditionvar->appendChild($doc->createElement('varequal', htmlspecialchars($textMatchAnswer->textmatch_answer_text)));
            $this->addAttribute($doc, 'respident', 'response1', $varequal);
        }
        $setvar = $respcondition->appendChild($doc->createElement('setvar', '100'));
        $this->addAttribute($doc, 'action', 'Set', $setvar);
        $this->addAttribute($doc, 'varname', 'SCORE', $setvar);
    }

    /**
    * QTI package requires an imsmanifest.xml file in the package root
    *
    * @param  []  $assessments
    * @return void
    */

    private function createManifest($assessments)
    {
        //set up the root
        $manifestDoc = new DOMDocument('1.0', 'UTF-8');
        $manifestDoc->formatOutput = true;

        //add manifest to root, along with a ton of attributes
        $manifest = $manifestDoc->appendChild($manifestDoc->createElement('manifest'));
        $identifier = $this->user->username . time(); //unique identifier
        $this->addAttribute($manifestDoc, 'identifier', $identifier, $manifest);
        $this->addAttribute($manifestDoc, 'xmlns', 'http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1', $manifest);
        $this->addAttribute($manifestDoc, 'xmlns:lom', 'http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource', $manifest);
        $this->addAttribute($manifestDoc, 'xmlns:imsmd', 'http://www.imsglobal.org/xsd/imsmd_v1p2', $manifest);
        $this->addAttribute($manifestDoc, 'xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance', $manifest);
        $this->addAttribute($manifestDoc, 'xsi:schemaLocation', 'http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lomresource_v1p0.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2p2.xsd', $manifest);

        //metadata
        $metadata = $manifest->appendChild($manifestDoc->createElement('metadata'));
        $schema = $metadata->appendChild($manifestDoc->createElement('schema', 'IMS Content'));
        $schemaversion = $metadata->appendChild($manifestDoc->createElement('schemaversion', '1.1.3'));
        $imsmd_lom = $metadata->appendChild($manifestDoc->createElement('imsmd:lom'));
        $imsmd_general = $imsmd_lom->appendChild($manifestDoc->createElement('imsmd:general'));
        $imsmd_title = $imsmd_general->appendChild($manifestDoc->createElement('imsmd:title'));
        $imsmd_string = $imsmd_title->appendChild($manifestDoc->createElement('imsmd:string', 'QTI export for user ' . $this->user->username));
        $imsmd_lifecycle = $imsmd_lom->appendChild($manifestDoc->createElement('imsmd:lifeCycle'));
        $imsmd_contribute = $imsmd_lifecycle->appendChild($manifestDoc->createElement('imsmd:contribute'));
        $imsmd_date = $imsmd_contribute->appendChild($manifestDoc->createElement('imsmd:date'));
        $imsmd_datetime = $imsmd_date->appendChild($manifestDoc->createElement('imsmd:dateTime', (new \DateTime())->format('Y-m-d')));
        $imsmd_rights = $imsmd_lom->appendChild($manifestDoc->createElement('imsmd:rights'));
        $imsmd_copyright = $imsmd_rights->appendChild($manifestDoc->createElement('imsmd:copyrightAndOtherRestrictions'));
        $imsmd_value = $imsmd_copyright->appendChild($manifestDoc->createElement('imsmd:value', 'yes'));
        $imsmd_description = $imsmd_rights->appendChild($manifestDoc->createElement('imsmd:description'));
        $imsmd_string = $imsmd_description->appendChild($manifestDoc->createElement('imsmd:string', 'Private (Copyrighted) - http://en.wikipedia.org/wiki/Copyright'));

        //blank organizations tag
        $organizations = $manifest->appendChild($manifestDoc->createElement('organizations'));

        //resources
        $resources = $manifest->appendChild($manifestDoc->createElement('resources'));
        foreach ($assessments as $assessment) {
            $identifier = $assessment->id;
            $metaIdentifier = $assessment->id . '_meta';

            //add QTI xml file
            $resource = $resources->appendChild($manifestDoc->createElement('resource'));
            $this->addAttribute($manifestDoc, 'identifier', $identifier, $resource);
            $this->addAttribute($manifestDoc, 'type', 'imsqti_xmlv1p2', $resource);
            $file = $resource->appendChild($manifestDoc->createElement('file'));
            $fileLocation = $identifier . '/' . $identifier . '.xml';
            $this->addAttribute($manifestDoc, 'href', $fileLocation, $file);
            $dependency = $resource->appendChild($manifestDoc->createElement('dependency'));
            $this->addAttribute($manifestDoc, 'identifierref', $metaIdentifier, $dependency);

            //add meta xml file
            $resource = $resources->appendChild($manifestDoc->createElement('resource'));
            $this->addAttribute($manifestDoc, 'identifier', $metaIdentifier, $resource);
            $this->addAttribute($manifestDoc, 'type', 'associatedcontent/imscc_xmlv1p1/learning-application-resource', $resource);
            $metaFileLocation = $identifier . '/assessment_meta.xml';
            $this->addAttribute($manifestDoc, 'href', $metaFileLocation, $resource);
            $file = $resource->appendChild($manifestDoc->createElement('file'));
            $this->addAttribute($manifestDoc, 'href', $metaFileLocation, $file);
        }

        //save the file
        Storage::put($this->unzippedLocation . '/imsmanifest.xml', $manifestDoc->saveXML());
    }

    /**
    * Create the assessment_meta.xml file in the directory of a particular assessment
    *
    * @param  Assessment  $assessment
    * @return void
    */

    private function createMetaFile($assessment)
    {
        $metaDoc = new DOMDocument('1.0', 'UTF-8');
        $metaDoc->formatOutput = true;

        $quiz = $metaDoc->appendChild($metaDoc->createElement('quiz'));
        $this->addAttribute($metaDoc, 'identifier', $assessment->id, $quiz);
        $this->addAttribute($metaDoc, 'xmlns', "http://canvas.instructure.com/xsd/cccv1p0", $quiz);
        $this->addAttribute($metaDoc, 'xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance', $quiz);
        $this->addAttribute($metaDoc, 'xsi:schemaLocation', 'http://canvas.instructure.com/xsd/cccv1p0 http://canvas.instructure.com/xsd/cccv1p0.xsd', $quiz);

        $title = $quiz->appendChild($metaDoc->createElement('title', htmlspecialchars($assessment->name)));
        $description = $quiz->appendChild($metaDoc->createElement('description', $assessment->description ? htmlspecialchars($assessment->description) : ' '));
        $shuffled = $this->isQuizShuffled($assessment);
        $shuffle_answers = $quiz->appendChild($metaDoc->createElement('shuffle_answers', $shuffled));
        $scoring_policy = $quiz->appendChild($metaDoc->createElement('scoring_policy', 'keep_highest'));
        $quiz_type = $quiz->appendChild($metaDoc->createElement('quiz_type', 'assignment'));
        $points_possible = $quiz->appendChild($metaDoc->createElement('points_possible', count($assessment->questions)));

        //save the file
        $location = $this->unzippedLocation . '/' . $assessment->id . '/assessment_meta.xml';
        $xmlOutput = $metaDoc->saveXML();
        Storage::put($location, $xmlOutput);
    }

    /**
    * Create the QTI file for an assessment
    *
    * @param  Assessment  $assessment
    * @return void
    */

    private function createQtiFile($assessment)
    {
        $qtiDoc = new DOMDocument('1.0', 'UTF-8');
        $qtiDoc->formatOutput = true;
        $questestinterop = $qtiDoc->appendChild($qtiDoc->createElement('questestinterop'));
        $this->addAttribute($qtiDoc, 'xmlns', 'http://www.imsglobal.org/xsd/ims_qtiasiv1p2', $questestinterop);
        $this->addAttribute($qtiDoc, 'xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance', $questestinterop);
        $this->addAttribute($qtiDoc, 'xsi:schemalocation', 'http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd', $questestinterop);

        //add assessment, meta data, and the root section
        $assessmentElem = $questestinterop->appendChild($qtiDoc->createElement('assessment'));
        $this->addAttribute($qtiDoc, 'ident', $assessment->id, $assessmentElem);
        $this->addAttribute($qtiDoc, 'title', htmlspecialchars($assessment->name), $assessmentElem);
        $qtimetadata = $assessmentElem->appendChild($qtiDoc->createElement('qtimetadata'));
        $qtimetadatafield = $qtimetadata->appendChild($qtiDoc->createElement('qtimetadatafield'));
        $fieldlabel = $qtimetadatafield->appendChild($qtiDoc->createElement('fieldlabel', 'cc_maxattempts'));
        $fieldentry = $qtimetadatafield->appendChild($qtiDoc->createElement('fieldentry', '1'));
        $section = $assessmentElem->appendChild($qtiDoc->createElement('section'));
        $this->addAttribute($qtiDoc, 'ident', 'root_section', $section);

        $questions = $assessment->questions;
        foreach ($questions as $question) {
            $this->convertQuestionToQti($qtiDoc, $section, $question);
        }

        //save the file
        $location = $this->unzippedLocation . '/' . $assessment->id . '/' . $assessment->id . '.xml';
        $xmlOutput = $qtiDoc->saveXML();
        Storage::put($location, $xmlOutput);
    }

    /**
    * Create location to place the zip file
    *
    * @return string $realZipPath
    */

    private function createZip()
    {
        $zip = new ZipArchive();
        //convert from laravel storage-specific path to system-level path
        $realZipPath = storage_path() . '/app/' . $this->zipLocation;
        if (!$zip->open($realZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE)) {
            //error in creating the zip
            return false;
        }
        //source for zip code inspiration:
        //http://stackoverflow.com/questions/4914750/how-to-zip-a-whole-folder-using-php
        $rootPath = storage_path() . '/app/' . $this->unzippedLocation;
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($rootPath),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $name => $file) {
            //Skip directories, they're added automatically
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($rootPath) + 1);
                $zip->addFile($filePath, $relativePath);
            }
        }

        $zip->close();
        return $realZipPath;
    }

    /**
    * Our app randomizes question options on a per-question level, and Canvas
    * does it on a per-quiz level; so to determine the shuffled property for
    * an export, search through all the questions in the assessment and if even
    * a single one of them is not randomized, then set shuffled to be false for
    * the Canvas quiz.
    *
    * @param  Assessment  $assessment
    * @return boolean $shuffled
    */

    private function isQuizShuffled($assessment)
    {
        $shuffled = 'true';
        $questions = $assessment->questions;
        foreach ($questions as $question) {
            if ($question->randomized == 'false') {
                $shuffled = 'false';
            }
        }
        return $shuffled;
    }

    /**
    * Set class member variables to be used for exporting before process begins
    *
    * @return void
    */

    private function setDirNames()
    {
        //get the zip file, unzip it in a directory named for the logged in user
        //all QTI imports temporarily go into a folder based on the username
        $username = $this->user->username;
        $this->parentDirName = $username;
        //unix timestamp and username for unique filename; pretty much impossible for the same user to upload from two
        //machines at roughly the same time, so we might not 100% need this, but crazier things have happened!
        $this->qtiDirName = time() . '-' . $username . '-' . 'QtiExport';
        $this->zipLocation = $this->parentDirName . '/' . $this->qtiDirName . '.zip';
        $this->unzippedLocation = $this->parentDirName . '/' . $this->qtiDirName;
    }
}
