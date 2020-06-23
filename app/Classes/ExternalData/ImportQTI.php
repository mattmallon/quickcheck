<?php

namespace App\Classes\ExternalData;
use Storage;
use Log;
use File;
use ZipArchive;
use DOMDocument;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;
use App\Models\Assessment;

class ImportQTI {
    //list of warnings issued to user when import/export is not 100% perfect
    private $warnings = [
        'critical' => [], //i.e., malformed XML, can't import the file
        'notices' => [] //i.e., broken image link, question type not supported
    ];

    //halt import if critical errors found that prevent quiz import
    private $criticalErrorFound = false;

    //if import halted, save working quizzes in progress
    private $importedQuizzes = [];

    //parent directory for QTI imports/exports for a user
    private $parentDirName = '';

    //directory where the import/export will live, inside user's parent directory
    private $qtiDirName = '';

    //directory where the zipped import/export is located, inside user's parent directory
    private $zipLocation = '';

    //location in storage where the unzipped QTI folder will temporarily live
    private $unzippedLocation = '';

    //use currently logged in user for naming directory
    private $username;

    //mappings of QTI item question types to in-app question types, when they differ
    private $questionTypeMappings = [
        'short_answer' => 'textmatch',
        'true_false' => 'multiple_choice',
        'multiple_answers' => 'multiple_correct',
        'multiple_dropdowns' => 'dropdown'
    ];

    //Canvas link mappings that are LMS-specific and need to be removed
    private $canvasLinksToRemove = [
        'WIKI_REFERENCE',
        'CANVAS_OBJECT_REFERENCE',
        'CANVAS_COURSE_REFERENCE',
        'IMS-CC-FILEBASE'
    ];

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Master function to import a QTI zip package
    * Will return a response containing potential warnings and imported quizzes.
    *
    * @param  Request  $request
    * @param  File     $zipFile
    * @return []       $response
    */

    public function import($request, $zipFile)
    {
        $input = $request->all();
        $this->username = $request->user->username;
        $assessmentGroupId = $input['assessment_group_id'];
        $this->unzipImport($zipFile);
        $allDirectories = Storage::directories($this->unzippedLocation);
        foreach ($allDirectories as $quizDirectory) {
            $quiz = $this->importQuiz($quizDirectory, $assessmentGroupId);
            if ($quiz) { //function returns quiz if successful or FALSE if a critical error occurred
                array_push($this->importedQuizzes, $quiz); //keep track of successfully imported quizzes
            }
        }
        //if no errors were found that prevented a quiz from being saved, then save them all, post-haste!
        //however, if a critical error was found, we want to ask the user first if they want to save the
        //quizzes that DID work or just stop the import process entirely so they can try again
        $quizzes = [];
        if (!$this->criticalErrorFound) {
            $quizzes = $this->saveQuizzes($this->importedQuizzes);
        }
        $this->cleanUp();
        $response = ['warnings' => $this->warnings, 'quizzes' => $quizzes];
        return $response;
    }

    /**
    * If a critical error was previously returned, and the user decides to go ahead and
    * save the quizzes that were successful, then this endpoint is hit to save them.
    *
    * @param  []  $quizzes
    * @return []  $assessments
    */

    //if critical warnings issued in import process, the user can choose whether or not to save the quizzes that DID import correctly
    public function saveQuizzes($quizzes)
    {
        $assessments = [];

        foreach ($quizzes as $quiz) {
            $assessment = new Assessment;
            $assessmentData = $assessment->createAssessment($quiz);
            array_push($assessments, $assessmentData);
        }

        return $assessments;
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Delete files after import, so they're not taking up space on the server
    *
    * @return void
    */

    private function cleanUp()
    {
        //delete the original zip file
        Storage::delete($this->zipLocation);
        //delete the unzipped directory
        Storage::deleteDirectory($this->unzippedLocation);
    }

    /**
    * Convert matching from imported QTI; grab actual &$question reference and
    * not value to make edits
    *
    * @param  []  $question
    * @param  SimpleXmlElement  $xmlArray
    * @return [] $answerOptions
    */

    private function convertMatching(&$question, $xmlArray)
    {
        $answerOptions = [];
        $usedAnswerOptions = []; //keep track so we can find the distractors
        $question['prompts'] = [];
        $question['distractors'] = [];
        //find the correct answer text for each
        $answerIds = $this->getQtiDropdownOrMatchingAnswers($xmlArray);
        $qtiMatchingPairs = $xmlArray->presentation->response_lid;
        $matchingIndex = 0;

        foreach ($qtiMatchingPairs as $qtiMatchingPair) {
            $optionText = (string) $qtiMatchingPair->material->mattext;
            //uniqueness of id here doesn't matter; just label with temp so new option is added
            $answerOptions[$matchingIndex]['id'] = 'id-temp';
            $answerOptions[$matchingIndex]['option_text'] = $optionText;
            $answerOptions[$matchingIndex]['question_id'] = $question['temp_id'];
            $answerOptions[$matchingIndex]['prompt_or_answer'] = 'prompt';
            $responseLabels = $qtiMatchingPair->render_choice->response_label;
            foreach ($responseLabels as $responseLabel) {
                $attributes = $responseLabel->attributes();
                foreach ($attributes as $attrKey => $attrValue) {
                    if ($attrKey == 'ident') {
                        if ($attrValue == $answerIds[$matchingIndex]) {
                            $answerText = (string) $responseLabel->material->mattext;
                            $answerOptions[$matchingIndex]['matching_answer_text'] = $answerText;
                            array_push($usedAnswerOptions, $answerText);
                            array_push($question['prompts'], $answerOptions[$matchingIndex]);
                        }
                    }
                }
            }

            //add distractors. if we've reached the end of all the matching prompts, we have added all
            //the correct answers, but we have not accounted for any distractor answers.
            if ($matchingIndex == count($qtiMatchingPairs) - 1) {
                foreach ($responseLabels as $responseLabel) {
                    $distractorText = (string) $responseLabel->material->mattext;
                    if (!in_array($distractorText, $usedAnswerOptions)) {
                        $matchingIndex++;
                        //uniqueness of id here doesn't matter; just label with temp so new option is added
                        $answerOptions[$matchingIndex]['id'] = 'id-temp';
                        $answerOptions[$matchingIndex]['option_text'] = $distractorText;
                        $answerOptions[$matchingIndex]['question_id'] = $question['temp_id'];
                        $answerOptions[$matchingIndex]['prompt_or_answer'] = 'answer';
                        array_push($question['distractors'], $answerOptions[$matchingIndex]);
                    }
                }
            }
            $matchingIndex++;
        }

        return $answerOptions;
    }

    /**
    * Convert multiple choice question from QTI to our app's data structure
    *
    * @param  []  $question
    * @param  SimpleXmlElement  $xmlArray
    * @return [] $answerOptions
    */

    private function convertMultChoice($question, $xmlArray)
    {
        $anwer = false;
        $respConditions = $xmlArray->resprocessing->respcondition;
        foreach ($respConditions as $respCondition) {
            $attributes = $respCondition->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                //if continue="yes" then it's feedback; if continue="no" then it's indicating correct answer
                if ($attrKey == 'continue' && $attrValue == 'No') {
                    $answer = (string) $xmlArray->resprocessing->respcondition->conditionvar->varequal;
                }
            }
        }
        $hasResponseFeedback = false;
        $answerOptions = [];
        $qtiOptions = $xmlArray->presentation->response_lid->render_choice->response_label;

        //add the options
        foreach ($qtiOptions as $qtiOption) {
            $mc_answer = [];
            $correct = 'false';
            $ident = '';
            $attributes = $qtiOption->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                if ($attrKey == 'ident') {
                    $ident = (string) $attrValue;
                }
            }
            if ($ident == $answer) {
                $correct = 'true';
            }
            $text = (string) $qtiOption->material->mattext;
            $mc_answer['id'] = 'id-temp'; //uniqueness here doesn't matter; just label with temp so new option is added
            $mc_answer['question_id'] = $question['temp_id'];
            $mc_answer['answer_text'] = $text;
            $mc_answer['correct'] = $correct;
            $responseFeedback = $this->getMcResponseFeedback($ident, $xmlArray);
            if ($responseFeedback) {
                $hasResponseFeedback = true;
                $mc_answer['mc_option_feedback'] = $responseFeedback;
            }

            array_push($answerOptions, $mc_answer);
        }

        // Canvas allows user to add response feedback to some but not all responses,
        // whereas our system requires that all options have feedback if the user
        // is adding custom feedback; so if any response feedback is detected, we
        // might need to add an empty string as the feedback so it's compatible with
        // our system. Thus, we need to check all the options to determine if feedback
        // is present (ran into an issue where, if B has feedback but A doesn't and
        // we're looping using foreach() then we would miss adding blank feedback to
        // A before pushing)
        if ($hasResponseFeedback) {
            foreach($answerOptions as &$answerOption) { //pass by reference so we can make changes
                if (!array_key_exists('mc_option_feedback', $answerOption)) {
                    $answerOption['mc_option_feedback'] = ['feedback_text' => ' '];
                }
            }
        }

        return $answerOptions;
    }

    /**
    * Convert multiple correct question from QTI to our app's data structure
    *
    * @param  []  $question
    * @param  SimpleXmlElement  $xmlArray
    * @return [] $answerOptions
    */

    private function convertMultCorrect($question, $xmlArray)
    {
        //get the correct answers
        $conditionVar = false;
        $respConditions = $xmlArray->resprocessing->respcondition;
        foreach ($respConditions as $respCondition) {
            $attributes = $respCondition->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                //if continue="yes" then it's feedback; if continue="no" then it's indicating correct answer
                if ($attrKey == 'continue' && $attrValue == 'No') {
                    $conditionVar = $respCondition->conditionvar;
                }
            }
        }
        $correctAnswerOptions = [];
        $hasResponseFeedback = false;
        $correctAnswers = $conditionVar->and->varequal;
        foreach ($correctAnswers as $correctAnswer) {
            $answerId = (string) $correctAnswer;
            array_push($correctAnswerOptions, $answerId);
        }
        //get all the options
        $answerOptions = [];
        $qtiOptions = $xmlArray->presentation->response_lid->render_choice->response_label;
        foreach ($qtiOptions as $qtiOption) {
            $mc_answer = [];
            $correct = 'false';
            $ident = '';
            $attributes = $qtiOption->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                if ($attrKey == 'ident') {
                    $ident = $attrValue;
                }
            }
            foreach ($correctAnswerOptions as $correctAnswer) {
                if ($ident == $correctAnswer) {
                    $correct = 'true';
                }
            }
            $text = (string) $qtiOption->material->mattext;
            $mc_answer['id'] = 'id-temp'; //uniqueness here doesn't matter; just label with temp so new option is added
            $mc_answer['question_id'] = $question['temp_id'];
            $mc_answer['answer_text'] = $text;
            $mc_answer['correct'] = $correct;
            $responseFeedback = $this->getMcResponseFeedback($ident, $xmlArray);

            //Canvas allows user to add response feedback to some but not all responses, whereas our system requires that
            //all options have feedback if the user is adding custom feedback; so if any response feedback is detected, we
            //might need to add an empty string as the feedback so it's compatible with our system
            if ($responseFeedback) {
                $hasResponseFeedback = true;
                $mc_answer['mc_option_feedback'] = $responseFeedback;
            }

            array_push($answerOptions, $mc_answer);
        }

        // Canvas allows user to add response feedback to some but not all responses,
        // whereas our system requires that all options have feedback if the user
        // is adding custom feedback; so if any response feedback is detected, we
        // might need to add an empty string as the feedback so it's compatible with
        // our system. Thus, we need to check all the options to determine if feedback
        // is present (ran into an issue where, if B has feedback but A doesn't and
        // we're looping using foreach() then we would miss adding blank feedback to
        // A before pushing)
        if ($hasResponseFeedback) {
            foreach($answerOptions as &$answerOption) { //pass by reference so we can make changes
                if (!array_key_exists('mc_option_feedback', $answerOption)) {
                    $answerOption['mc_option_feedback'] = ['feedback_text' => ' '];
                }
            }
        }

        return $answerOptions;
    }

    /**
    * Convert multiple dropdown from imported QTI; grab actual &$question reference
    * and not value to make edits
    *
    * @param  []  $question
    * @param  SimpleXmlElement  $xmlArray
    * @return [] $answerOptions
    */

    private function convertMultDropdown(&$question, $xmlArray)
    {
        $answerOptions = [];
        $question['prompts'] = [];
        $questionText = $question['question_text'];
        //Canvas puts brackets in question text; instead, we want to separate
        //into prompts and answers
        $question['question_text'] = '';
        $questionPrompts = preg_split('/\[.*?\]/', $questionText);
        //NOTE: Canvas allows adding additional text after the dropdown answer.
        //Our system does not. Any additional text is added afterward to
        //the next to last prompt text. This should close out any remaining
        //div or p tags. Not an ideal solution, but the closest we have.
        $nextToLastItem = $questionPrompts[count($questionPrompts) - 2];
        $lastItem = $questionPrompts[count($questionPrompts) - 1];
        $questionPrompts[count($questionPrompts) - 2] = $nextToLastItem . $lastItem;
        unset($questionPrompts[count($questionPrompts) - 1]);

        foreach ($questionPrompts as $promptIndex => $questionPrompt) {
            $answerOption = [];
            $answerOption['id'] = 'id-temp'; //uniqueness here doesn't matter; just label with temp so new option is added
            $answerOption['question_id'] = $question['temp_id'];
            $answerOption['answer_text'] = strip_tags($questionPrompt);
            $answerOption['prompt_or_answer'] = 'prompt';
            $answerOption['answer_order'] = $promptIndex + 1;
            array_push($answerOptions, $answerOption);
        }
        //find the correct answer text for each
        $answerIds = $this->getQtiDropdownOrMatchingAnswers($xmlArray);
        $qtiDropdownPairs = $xmlArray->presentation->response_lid;
        //can't get index from foreach loop since iterating over an object, defining my own index
        $dropdownIndex = 0;

        foreach ($qtiDropdownPairs as $qtiDropdownPair) {
            $responseLabel = $qtiDropdownPair->render_choice->response_label;
            $attributes = $responseLabel->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                if ($attrKey == 'ident') {
                    if ($attrValue == $answerIds[$dropdownIndex]) {
                        $answerOptions[$dropdownIndex]['dropdown_answer_text'] = (string) $responseLabel->material->mattext;
                        array_push($question['prompts'], $answerOptions[$dropdownIndex]);
                    }
                }
            }
            $dropdownIndex++;
        }

        return $answerOptions;
    }

    /**
    * Convert numerical question from QTI to our app's data structure
    *
    * @param  []  $question
    * @param  SimpleXmlElement  $xmlArray
    * @return [] $answerOptions
    */

    private function convertNumerical($question, $xmlArray)
    {
        $answerOptions = [];

        $qtiAnswers = $xmlArray->resprocessing->respcondition;
        foreach ($qtiAnswers as $qtiAnswer) {
            $answerOption = [
                'id' => 'id-temp',
                'question_id' => $question['temp_id']
            ];

            //'numerical_answer' => $qtiAnswer->conditionvar->or->varequal
            if ($qtiAnswer->conditionvar->or) { //exact answer with margin of error
                $answerOption['answer_type'] = 'exact';
                $exactAnswer = floatval($qtiAnswer->conditionvar->or->varequal);
                $vargte = floatval($qtiAnswer->conditionvar->or->and->vargte); //minimum allowed answer
                $answerOption['numerical_answer'] = $exactAnswer;
                $answerOption['margin_of_error'] = $exactAnswer - $vargte;
            }
            else if ($qtiAnswer->conditionvar->vargte) { //range
                $answerOption['answer_type'] = 'range';
                $answerOption['range_min'] = $qtiAnswer->conditionvar->vargte;
                $answerOption['range_max'] = $qtiAnswer->conditionvar->varlte;
            }
            array_push($answerOptions, $answerOption);
        }

        return $answerOptions;
    }

    /**
    * Convert short answer question from QTI to textmatch in our app's data structure
    *
    * @param  []  $question
    * @param  SimpleXmlElement  $xmlArray
    * @return [] $answerOptions
    */

    private function convertShortAnswer($question, $xmlArray) {
        $answerOptions = [];
        //get the correct answers
        $conditionVar = false;
        $respConditions = $xmlArray->resprocessing->respcondition;

        foreach ($respConditions as $respCondition) {
            $attributes = $respCondition->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                //if continue="yes" then it's feedback; if continue="no" then it's indicating correct answer
                if ($attrKey == 'continue' && $attrValue == 'No') {
                    $conditionVar = $respCondition->conditionvar;
                }
            }
        }
        $correctAnswers = $this->getQtiShortAnswerAnswers($conditionVar);
        $correctAnswerOptions = [];
        $correctAnswers = $conditionVar->varequal;

        foreach ($correctAnswers as $correctAnswer) {
            $answerId = (string) $correctAnswer;
            array_push($correctAnswerOptions, $answerId);
        }

        foreach ($correctAnswerOptions as $correctAnswer) {
            $textMatchAnswer = [];
            $textMatchAnswer['id'] = 'id-temp'; //uniqueness here doesn't matter; just label with temp so new option is added
            $textMatchAnswer['question_id'] = $question['temp_id'];
            $textMatchAnswer['textmatch_answer_text'] = $correctAnswer;
            array_push($answerOptions, $textMatchAnswer);
        }

        return $answerOptions;
    }

    /**
    * Format question to remove LMS-specific content, extraneous html tags, etc.
    *
    * @param  DomDocument  $htmlDoc
    * @return string $questionText
    */

    private function formatQuestionText($htmlDoc)
    {
        $warning = '';

        //remove all LMS-specific links
        $allLinks = $htmlDoc->getElementsByTagName('a');
        $lmsLinksRemoved = $this->removeLmsLinks($allLinks);

        //remove LMS-specific media and iframes
        $imagesRemoved = $this->removeLMSImages($htmlDoc);
        $iframesRemoved = $this->removeLtiIframeEmbeds($htmlDoc);

        //get subset of doc; it automatically adds html/body
        $contentNode = $htmlDoc->getElementsByTagName('body')[0];
        //update the question text with items removed
        $questionText = $htmlDoc->saveHTML($contentNode);

        //remove body tags (DOMDocument requires a single node in saveHTML, can't get all children of body tag)
        $questionText = str_replace('<body>', '', $questionText);
        $questionText = str_replace('</body>', '', $questionText);
        //get rid of funny unicode characters that appear in the conversion process--I think this is
        //a UTF-8 issue? Couldn't quite figure it out, but this solution worked whereas other
        //solutions I found online did not work...
        $questionText = str_replace("Â", '', $questionText);

        //if LMS-specific content removed, notify the user
        if (count($lmsLinksRemoved)) {
            $warning = 'LMS-specific link removed. ';
        }
        if (count($imagesRemoved)) {
            $warning = $warning . 'Embedded LMS-specific image removed. ';
        }
        if (count($iframesRemoved)) {
            $warning = $warning . 'Embedded LMS-specific LTI iframe removed. ';
        }
        if ($warning) {
            $warning = 'LMS-specific content was removed from the following question: <br>' . $questionText;
            $this->setNoticeError($warning);
        }

        return $questionText;
    }

    /**
    * Get answer options from a QTI question
    *
    * @param  []  $question (pass by value, not reference, for in-place changes)
    * @param  string  $questionType
    * @param  string  $questionText
    * @param  SimpleXmlElement  $xmlArray
    * @return [] $answerOptions on success, FALSE on error
    */

    private function getAnswerOptions(&$question, $questionType, $questionText, $xmlArray)
    {
        $answerOptions = [];

        switch ($questionType) {
            case 'multiple_choice':
                $answerOptions = $this->convertMultChoice($question, $xmlArray);
                break;
            case 'multiple_correct':
                $answerOptions = $this->convertMultCorrect($question, $xmlArray);
                break;
            case 'textmatch':
                $answerOptions = $this->convertShortAnswer($question, $xmlArray);
                break;
            case 'dropdown':
                $answerOptions = $this->convertMultDropdown($question, $xmlArray);
                break;
            case 'matching':
                $answerOptions = $this->convertMatching($question, $xmlArray);
                break;
            case 'numerical':
                $answerOptions = $this->convertNumerical($question, $xmlArray);
                break;
            case 'fill_in_multiple_blanks':
            case 'calculated':
            case 'essay':
            case 'file_upload':
            case 'text_only':
                $this->handleIncomatibleQuestionType($questionType, $questionText);
                return false;
                break;
            default:
                $readableQuestionType = $this->getReadableQuestionType($questionType);
                $warning = 'Question type not found for ' . $readableQuestionType . '. The following question will not be included: <br> ' . $questionText;
                $this->setNoticeError($warning);
                return false;
                break;
        }

        return $answerOptions;
    }

    /**
    * Get per-response feedback
    *
    * @param  string  $ident
    * @param  SimpleXmlElement  $xmlArray
    * @return []  $feedback
    */

    private function getMcResponseFeedback($ident, $xmlArray)
    {
        $feedback = false;
        $feedbackText = false;
        $feedbackItems = $xmlArray->itemfeedback;
        foreach ($feedbackItems as $feedbackItem) {
            $attributes = $feedbackItem->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                if ($attrKey == 'ident') {
                    if ($attrValue == (string) $ident . '_fb') {
                        $feedbackText = strip_tags($feedbackItem->flow_mat->material->mattext);
                    }
                }
            }
        }

        if ($feedbackText) {
            //NOTE: don't need to include the mc_answer_id, as that will be assigned later after saving the option and
            //getting the saved ID from the database; since feedback is a nested array, it's already grouped with its option
            $feedback = [
                'feedback_text' => $feedbackText
            ];
        }

        return $feedback;
    }

    /**
    * Get question text in plain string from a QTI question
    *
    * @param  SimpleXmlElement  $xmlArray
    * @return string
    */

    private function getQtiQuestionText($xmlArray)
    {
        $questionText = $xmlArray->presentation->material->mattext;
        //search for incompatible Canvas/Kaltura elements
        $htmlDoc = new DOMDocument();
        //html from Canvas is riddled with formatting errors from robo-code (i.e., duplicate IDs),
        //and dom document will throw an error, so we need to disable external errors (2nd answer):
        //http://stackoverflow.com/questions/1148928/disable-warnings-when-loading-non-well-formed-html-by-domdocument-php
        libxml_use_internal_errors(true);
        $htmlLoaded = $htmlDoc->loadHTML($questionText);
        libxml_clear_errors();
        if (!$htmlLoaded) {
            $warning = 'HTML did not load properly for the following question text: <br>' . $questionText;
            $this->setNoticeError($warning);
            return ''; //return blank string for question text
        }

        return $this->formatQuestionText($htmlDoc);
    }

    /**
    * Get the question type from the XML and convert the naming structure to match our own
    *
    * @param  SimpleXMLElement  $xmlArray
    * @return string $questionType
    */

    private function getQtiQuestionType($xmlArray)
    {
        $questionTypeRaw = null; //what we get from the XML
        $questionTypeSplit = null; //split on _question at the end
        $questionType = null;

        $qtiMetaDataFields = $xmlArray->itemmetadata->qtimetadata->qtimetadatafield;
        foreach ($qtiMetaDataFields as $field) {
            if ($field->fieldlabel == 'question_type') {
                $questionTypeRaw = $field->fieldentry;
            }
        }
        //i.e., change from multiple_choice_question to multiple_choice
        $questionTypeSplit = explode('_question', $questionTypeRaw);
        $questionType = $questionTypeSplit[0];

        //if our nomenclature differs from Canvas's, then map appropriately
        if (array_key_exists($questionType, $this->questionTypeMappings)) {
            return $this->questionTypeMappings[$questionType];
        }

        return $questionType;
    }

    /**
    * Get answer IDs for correct answers for dropdown and matching questions from a QTI import
    *
    * @param  SimpleXmlElement  $xmlArray
    * @return []  $answerIds
    */

    private function getQtiDropdownOrMatchingAnswers($xmlArray)
    {
        $answerIds = [];
        $respConditions = $xmlArray->resprocessing->respcondition;
        foreach ($respConditions as $respCondition) {
            $isFeedback = count($respCondition->displayfeedback);
            if (!$isFeedback) {
                $answerId = (string) $respCondition->conditionvar->varequal;
                array_push($answerIds, $answerId);
            }
        }
        return $answerIds;
    }

    /**
    * Get general-level feedback
    *
    * @param  SimpleXmlElement  $xmlArray
    * @param  []  $question
    * @return []  $feedback
    */

    private function getQtiQuestionFeedback($xmlArray, $question)
    {
        $feedbackIncluded = false;
        $correctFeedback = false;
        $incorrectFeedback = false;
        $feedback = false;

        $feedbackItems = $xmlArray->itemfeedback;
        foreach ($feedbackItems as $feedbackItem) {
            $attributes = $feedbackItem->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                if ($attrKey == 'ident') {
                    if ($attrValue == 'correct_fb') {
                        $feedbackIncluded = true;
                        $correctFeedback = strip_tags($feedbackItem->flow_mat->material->mattext);
                    }
                    else if ($attrValue == 'general_incorrect_fb') {
                        $feedbackIncluded = true;
                        $incorrectFeedback = strip_tags($feedbackItem->flow_mat->material->mattext);
                    }
                }
            }
        }

        //Note: Canvas will allow user to only include one type of feedback but not the other; not so with our app!
        //if the user has one filled out but not the other, insert a blank string as feedback to prevent an error
        if ($correctFeedback && !$incorrectFeedback) {
            $incorrectFeedback = ' ';
        }
        else if ($incorrectFeedback && !$correctFeedback) {
            $correctFeedback = ' ';
        }

        if ($feedbackIncluded) {
            $feedback = [
                [
                    'question_id' => $question['temp_id'],
                    'feedback_text' => $correctFeedback,
                    'correct' => 'true'
                ],
                [
                    'question_id' => $question['temp_id'],
                    'feedback_text' => $incorrectFeedback,
                    'correct' => 'false'
                ]
            ];
        }

        return $feedback;
    }

    /**
    * Get text for answers to textmatch/short answer
    *
    * @param  DOMNode  $conditionVar
    * @return []  $returnedAnswers
    */

    private function getQtiShortAnswerAnswers($conditionVar)
    {
        $returnedAnswers = [];
        $correctAnswers = $conditionVar->varequal;
        foreach ($correctAnswers as $correctAnswer) {
            $answerId = (string) $correctAnswer;
            array_push($returnedAnswers, $answerId);
        }

        return $returnedAnswers;
    }

    /**
    * Get title, description, and shuffled answer order from assessment_meta.xml
    *
    * @param  string  $quizDirectory
    * @return [] $assessment
    */

    private function getQuizMetaData($quizDirectory)
    {
        $assessment = [];
        //if no meta file, return false, critical error
        if (!File::exists(storage_path() . '/app/' . $quizDirectory . '/assessment_meta.xml')) {
            return false;
        }

        $quizMetaContents = Storage::get($quizDirectory . '/assessment_meta.xml');
        $xmlMetaArray = simplexml_load_string($quizMetaContents);
        $quizTitle = (string) $xmlMetaArray->title;
        $description = (string) $xmlMetaArray->description;
        $assessment['title'] = $quizTitle;
        $assessment['name'] = $quizTitle; //our app has an internal-use-only name attribute
        $assessment['description'] = strip_tags($description);
        $assessment['shuffled'] = 'false'; //Canvas doesn't allow shuffling question order, only answer options
        return $assessment;
    }

    /**
    * Convert from xml not_prettified_version to a display version.
    * This is used for displaying warnings to users (i.e., essay type not supported).
    *
    * @param  string  $questionType
    * @return string $readableQuestionType
    */

    private function getReadableQuestionType($questionType)
    {
        $typeWithUnderscoresSplit = explode('_', $questionType);
        $readableQuestionType = '';
        foreach ($typeWithUnderscoresSplit as $stringIndex => $questionPiece) {
            //don't want to add a space at the start of the string
            if ($stringIndex == 0) {
                $readableQuestionType = $questionPiece;
            }
            else {
                $readableQuestionType = $readableQuestionType . ' ' . $questionPiece;
            }
        }
        $readableQuestionType = ucfirst($readableQuestionType) . ' ';
        return $readableQuestionType;
    }

    /**
    * If incompatible question type found, add to the notices array and log it.
    *
    * @param  string  $questionType
    * @param  string  $questionText
    * @return void
    */

    private function handleIncomatibleQuestionType($questionType, $questionText)
    {
        $readableQuestionType = $this->getReadableQuestionType($questionType);
        $warning = 'The question type ' . $readableQuestionType . 'is not supported by this application. The following question will not be included: ' . $questionText;
        $this->setNoticeError($warning);
    }

    /**
    * Check to see if user is trying to import feedback that is available in Canvas
    * but not in our app (i.e., general feedback, and per-response feedback for
    * questions that aren't multiple choice/correct)
    *
    * @param  SimpleXmlElement  $xmlArray
    * @param  string  $questionType
    * @return boolean
    */

    private function hasIncompatibleFeedback($xmlArray, $questionType)
    {
        $incompatibleFeedback = false;
        //if not a multiple choice/multiple correct question type, then wrong question type for allowing response feedback
        $wrongQuestionType = $questionType !== 'multiple_choice' && $questionType !== 'multiple_correct' ? true : false;

        $feedbackItems = $xmlArray->itemfeedback;
        foreach ($feedbackItems as $feedbackItem) {
            $attributes = $feedbackItem->attributes();
            foreach ($attributes as $attrKey => $attrValue) {
                //check for general feedback and per-response feedback if not multiple choice/multiple correct
                if ($attrKey == 'ident') {
                    if ($attrValue == 'general_fb') {
                        $incompatibleFeedback = true;
                    }
                    if ($attrValue !== 'correct_fb' && $attrValue !== 'general_incorrect_fb' && $wrongQuestionType) {
                        $incompatibleFeedback = true;
                    }

                }
            }
        }

        return $incompatibleFeedback;
    }

    /**
    * Import a single QTI question
    *
    * @param  SimpleXmlElement  $xmlArray
    * @param  int  $questionOrder
    * @return [] $question
    */

    private function importItem($xmlArray, $questionOrder)
    {
        $question = [];
        $questionType = $this->getQtiQuestionType($xmlArray);
        $questionText = $this->getQtiQuestionText($xmlArray);

        //add general question info
        $question['question_type'] = $questionType;
        $question['question_text'] = $questionText;
        $question['question_order'] = $questionOrder;
        $question['temp_id'] = 'temp-' . $questionOrder; //temp-id for possible internal use

        //add question-level custom feedback, if necessary
        $questionFeedback = $this->getQtiQuestionFeedback($xmlArray, $question);
        if ($questionFeedback) {
            $question['question_feedback'] = $questionFeedback;
        }

        $answerOptions = $this->getAnswerOptions($question, $questionType, $questionText, $xmlArray);
        if (!$answerOptions) {
            return false;
        }

        if ($this->hasIncompatibleFeedback($xmlArray, $questionType)) {
            $warning = 'An imported question has incompatible feedback, meaning that it contains feedback that is available in Canvas but not in Quick Check. Quick Check allows question-level correct and incorrect feedback, as well as response-level feedback for multiple choice and multiple correct questions. If your question contains general feedback or response-level feedback for question types other than multiple choice or multiple correct, the feedback will not be included. The following question had incompatible feedback: <br>' . $questionText;
            $this->setNoticeError($warning);
        }

        $question['options'] = $answerOptions;
        return $question;
    }

    /**
    * Import all QTI items (i.e., questions) in a quiz
    *
    * @param  DOMDocument  $doc
    * @param  []  $assessment
    * @return [] $questions
    */

    private function importItems($doc, $assessment)
    {
        $questions = [];
        $skippedQuestionCount = 0; //to maintain correct question order, subtract skipped incompatible questions
        $items = $doc->getElementsByTagName('item');
        foreach ($items as $index => $item) {
            //question order is 1 through quiz length, subtract incompatible questions so sequence remains intact
            $questionOrder = $index + 1 - $skippedQuestionCount;
            $xmlArray = simplexml_load_string($doc->saveXML($item));
            $question = $this->importItem($xmlArray, $questionOrder);
            if (!$question) {
                $skippedQuestionCount++;
            }
            else {
                //from meta information for the quiz; Canvas does this on quiz-level, but we do it on a per-question level
                $question['randomized'] = $assessment['shuffled'];
                $question['multiple_correct'] = 'false'; //not an option in Canvas to have 2+ answers correct in multiple choice
                array_push($questions, $question);
            }
        }
        return $questions;
    }

    /**
    * Import a single quiz from a directory in an unzipped QTI package
    *
    * @param  string  $quizDirectory
    * @param  int  $assessmentGroupId
    * @return [] $assessment
    */

    private function importQuiz($quizDirectory, $assessmentGroupId)
    {
        //get meta information (title, description, shuffled answers, etc.)
        $assessment = $this->getQuizMetaData($quizDirectory);
        //if no meta file, it's likely tacked-on gobbledygook that we can ignore
        if (!$assessment) {
            return false;
        }

        $doc = $this->loadXmlDoc($quizDirectory);
        if (!$doc) {
            $warning = 'Error loading XML document for quiz titled: ' . $assessment['title'] . '. Aborting import for this quiz.';
            $this->setCriticalError($warning);
            return false;
        }

        $questions = $this->importItems($doc, $assessment);
        $assessment['questions'] = $questions;
        $assessment['assessment_group_id'] = $assessmentGroupId;
        return $assessment;
    }

    /**
    * Load XML into PHP DOMDocument
    *
    * @param  string  $quizDirectory
    * @return [] $assessment, or false on failure
    */

    private function loadXmlDoc($quizDirectory)
    {
        $xmlFiles = Storage::files($quizDirectory);
        $quizXmlFile = '';
        foreach ($xmlFiles as $xmlFile) {
            if (!strpos($xmlFile, 'assessment_meta')) {
                $quizXmlFile = $xmlFile;
            }
        }
        //if not a valid XML file, return false
        if (!strpos($quizXmlFile, '.xml')) {
            return false;
        }
        $fileContents = Storage::get($quizXmlFile);
        $doc = new DOMDocument();
        $hasLoaded = $doc->loadXML($fileContents);
        if ($hasLoaded) {
            return $doc;
        }

        return false;
    }

    /**
    * Remove images that were uploaded to the LMS rather than being hyperlinked
    * in; our service does not support file uploads
    *
    * @param  DOMDocument  $htmlDoc
    * @return DomNodeList
    */

    private function removeLMSImages($htmlDoc)
    {
        $images = $htmlDoc->getElementsByTagName('img');
        $imagesToRemove = []; //must remove separately from foreach, otherwise iterator messes up
        foreach ($images as $image) {
            $src = $image->getAttribute('src');
            if (strpos($src, 'IMS-CC-FILEBASE')) {
                array_push($imagesToRemove, $image);
            }
        }
        foreach ($imagesToRemove as $image) {
            $image->parentNode->removeChild($image);
        }

        return $imagesToRemove;
    }

    /**
    * Remove links that are LMS-specific from QTI import
    *
    * @param  DomNodeList  $allLinks
    * @return DomNodeList
    */

    private function removeLmsLinks($allLinks)
    {
        //see first comment: http://php.net/manual/en/domnode.removechild.php
        //iterator gets out of whack when removing in foreach loop, instead have to queue
        //in an array and do the foreach/remove then. Weird.
        $domElemsToRemove = [];
        foreach ($allLinks as $link) {
            $href = $link->getAttribute('href');
            foreach($this->canvasLinksToRemove as $canvasLinkText) {
                if (strpos($href, $canvasLinkText)) {
                    array_push($domElemsToRemove, $link);
                }
            }
        }
        foreach ($domElemsToRemove as $domElem) {
            $domElem->parentNode->removeChild($domElem);
        }

        return $domElemsToRemove;
    }

    /**
    * Remove iframes that specifically reference LTI tools installed in the course
    *
    * @param  DOMDocument  $htmlDoc
    * @return DomNodeList
    */

    private function removeLtiIframeEmbeds($htmlDoc)
    {
        $allIframes = $htmlDoc->getElementsByTagName('iframe');
        $iframesToRemove = []; //must remove separately from foreach, otherwise iterator messes up
        foreach ($allIframes as $iframe) {
            $src = $iframe->getAttribute('src');
            if (strpos($src, 'CANVAS_COURSE_REFERENCE')) {
                array_push($iframesToRemove, $iframe);
            }
        }
        foreach ($iframesToRemove as $iframe) {
            $iframe->parentNode->removeChild($iframe);
        }

        return $iframesToRemove;
    }

    /**
    * Set a critical error on the import to alert the user that major problems occurred
    *
    * @param  string  $warning
    * @return void
    */

    private function setCriticalError($warning)
    {
        array_push($this->warnings['critical'], $warning);
        $this->criticalErrorFound = true;
        Log::notice('QTI import critical error for user -- ' . $this->username . ' -- ' . $warning);
    }

    /**
    * Set class member variables to be used for importing before upload process begins
    *
    * @return void
    */

    private function setDirNames()
    {
        //get the zip file, unzip it in a directory named for the logged in user
        //all QTI imports temporarily go into a folder based on the username
        $this->parentDirName = $this->username;
        //unix timestamp and username for unique filename
        $this->qtiDirName = time() . '-' . $this->username . '-' . 'QtiImport';
        $this->zipLocation = $this->parentDirName . '/' . $this->qtiDirName . '.zip';
        $this->unzippedLocation = $this->parentDirName . '/' . $this->qtiDirName;
    }

    /**
    * Set a notice error on the import to alert the user to minor problems
    *
    * @param  string  $warning
    * @return void
    */

    private function setNoticeError($warning)
    {
        array_push($this->warnings['notices'], $warning);
        Log::notice('QTI import notice for user -- ' . $this->username . ' -- ' . $warning);
    }

    /**
    * Unzip the uploaded QTI file
    *
    * @param  File  $zipFile
    * @return boolean (on success)
    */

    private function unzipImport($zipFile)
    {
        $this->setDirNames();
        $zipFile->move(storage_path() . '/app/' . $this->parentDirName . '/', $this->qtiDirName . '.zip');
        $zip = new ZipArchive;

        if (!$zip->open(storage_path() . '/app/' . $this->zipLocation)) {
            Log::notice('Error importing QTI .zip package for user: ' . $this->username);
            $errorReason = 'There was an error importing your QTI .zip file. Please ensure it is the correct file format and try again.';
            abort(500, $errorReason);
        }

        $zip->extractTo(storage_path() . '/app/' . $this->unzippedLocation);
        $zip->close();

        //Canvas spits out a directory for each quiz, and then this non_cc_assessments
        //directory which doesn't seem to contain anything?
        if (Storage::exists($this->unzippedLocation . '/non_cc_assessments')) {
            Storage::deleteDirectory($this->unzippedLocation . '/non_cc_assessments');
        }

        return true;
    }
}
