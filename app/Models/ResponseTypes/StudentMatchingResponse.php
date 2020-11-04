<?php
namespace App\Models\ResponseTypes;
use App\Classes\StudentResponses\StudentResponseTypeInterface as StudentResponseType;
use App\Models\StudentResponse;

class StudentMatchingResponse extends StudentResponseType {
    protected $table = 'student_matching_responses';
    protected $fillable = [
        'student_response_id',
        'matching_prompt_id',
        'matching_answer_id'
    ];
    protected $casts = [
        'student_response_id' => 'integer',
        'matching_prompt_id' => 'integer',
        'matching_answer_id' => 'integer'
    ];
    private $RESPONSE_TYPE = 'matching_responses';
    private $QUESTION_TYPE = 'matching';
    private $PROMPT_ID = 'matching_prompt_id';
    private $ANSWER_ID = 'matching_answer_id';
    private $TEXT_FIELD = 'option_text';

    public function matchingPrompt() {
        //specify foreign, then local key, since prompt/answer are not in the table name for matching_answers
        return $this->hasOne('App\Models\AnswerTypes\MatchingAnswer', 'id', 'matching_prompt_id');
    }

    public function matchingAnswer() {
        //specify foreign, then local key, since prompt/answer are not in the table name for matching_answers
        return $this->hasOne('App\Models\AnswerTypes\MatchingAnswer', 'id', 'matching_answer_id');
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Build CSV export array for a student's response
    *
    * @param  []               $studentResponse
    * @param  Attempt          $attempt
    * @param  AnswerDictionary $answerDiciontary
    * @return []
    */

    public function buildResponseExport($studentResponse, $attempt, $answerDictionary) {
        $this->answerDictionary = $answerDictionary;
        $response = StudentResponse::addGeneralInfoToResponse($studentResponse, $attempt);
        $selectedAnswers = $studentResponse[$this->RESPONSE_TYPE];

        $response['answer'] = $this->parseMatchingResponseForExport($selectedAnswers);
        $this->addQuestionToExport($selectedAnswers, $response);
        return $response;
    }

    /**
    * Determined associated option IDs from student response
    *
    * @param  []        $studentResponse
    * @param  Question  $question
    * @return []
    */

    public function getOptionIdsFromResponse($studentResponse, $question) {
        $matchingResponses = $studentResponse[$this->RESPONSE_TYPE];
        $optionIds = [];
        foreach($matchingResponses as $matchingResponse) {
            $promptId = $matchingResponse[$this->PROMPT_ID];
            $answerId = $matchingResponse[$this->ANSWER_ID];
            $optionSelected = ['primary' => $promptId, 'paired' => $answerId];
            array_push($optionIds, $optionSelected);
        }
        return $optionIds;
    }

    /**
    * Determined associated question ID from student response
    *
    * @param  [] $studentResponse
    * @return int
    */

    public function getQuestionIdFromResponse($studentResponse) {
        $matchingResponses = $studentResponse[$this->RESPONSE_TYPE];
        $optionId = $matchingResponses[0][$this->ANSWER_ID]; //we had to have had at least one response to get here
        $questionId = $this->answerDictionary->getQuestionIdFromOption($optionId, $this->QUESTION_TYPE);
        return $questionId;
    }

    /**
    * Save a student's answer
    *
    * @param  StudentResponse  $studentResponse
    * @param  []               $studentAnswer
    * @param  int              $questionId
    * @return void
    */

    public function saveAnswer($studentResponse, $studentAnswer, $questionId) {
        foreach ($studentAnswer['matching_answers'] as $matchingAnswer) {
            $matchingResponse = new StudentMatchingResponse;
            $matchingResponse->student_response_id = $studentResponse->id;
            $matchingResponse->matching_prompt_id = $matchingAnswer['prompt_id'];
            $matchingResponse->matching_answer_id = $matchingAnswer['answer_id'];
            $matchingResponse->save();
        }
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Add general question information to an exported CSV response row
    *
    * @param  []  $selectedAnswers
    * @param  []  $response
    * @return void
    */

    private function addQuestionToExport($selectedAnswers, &$response) {
        $optionId = $selectedAnswers[0][$this->ANSWER_ID];
        $this->answerDictionary->addQuestionToResponse($response, $optionId, $this->QUESTION_TYPE);
    }

    /**
    * Translate the response answer into plain text for a CSV export
    *
    * @param  []  $selectedAnswers
    * @return string
    */

    private function parseMatchingResponseForExport($selectedAnswers) {
        $answer = '';
        foreach ($selectedAnswers as $selectedAnswer) {
            $promptId = $selectedAnswer[$this->PROMPT_ID];
            $optionId = $selectedAnswer[$this->ANSWER_ID];
            $prompt = $this->answerDictionary->getAnswer($promptId, $this->QUESTION_TYPE, $this->TEXT_FIELD);
            $option = $this->answerDictionary->getAnswer($optionId, $this->QUESTION_TYPE, $this->TEXT_FIELD);
            $answer .= 'prompt: ' . $prompt . ', answer: ' . $option . '; ';
        }
        return $answer;
    }
}
