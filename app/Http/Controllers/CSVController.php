<?php

use Illuminate\Http\Request;

use App\Http\Requests;
use App\Classes\ExternalData\CSV as CSV;
use App\Classes\Questions\AnswerDictionary;
use App\Models\Assessment;
use App\Models\Attempt;
use App\Models\CourseContext;
use App\Models\Question;
use App\Models\User;

class CSVController extends \BaseController
{
    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * Export all attempts for a single assessment
    *
    * @param  string  $context_id
    * @param  int  $assessment_id
    * @return Response (CSV download)
    */

    public function exportAssessmentAttempts(Request $request, $context_id, $assessment_id)
    {
        $exportedAttempts = [];
        $includes = [
            'assessment',
            'assessment.questions',
            'student',
            'studentResponses',
            'lineItem'
        ];
        $courseContext = CourseContext::where('lti_context_id', '=', $context_id)->first();

        $query = Attempt::with($includes)
            ->where('course_context_id', '=', $courseContext->id)
            ->where('assessment_id', '=', $assessment_id)
            ->orderBy('id'); //required by Laravel for chunking

        $filename = 'attempts_' . $assessment_id;
        $csv = new CSV($filename);
        return $csv->downloadAttempts($query, $courseContext);
    }

    /**
    * Export all responses for a single assessment
    *
    * @param  string  $context_id
    * @param  int  $assessment_id
    * @return Response (CSV download)
    */

    public function exportAssessmentResponses(Request $request, $assessment_id, $context_id)
    {
        $assessment = Assessment::find($assessment_id);
        $courseContext = CourseContext::where('lti_context_id', '=', $context_id)->first();
        $answerDictionary = null;

        if (!$assessment->isCustomAssessment()) {
            $questionModel = new Question;
            $noAnswers = false;
            $questions = $questionModel->getAssessmentQuestions($assessment_id, $noAnswers);
            //convert response options to dictionary to retrieve each response in O(1) time
            $answerDictionary = new AnswerDictionary($questions);
        }

        $query = Attempt::where('course_context_id', '=', $courseContext->id)
            ->where('assessment_id', '=', $assessment_id)
            ->orderBy('id'); //required by Laravel for chunking

        $filename = 'responses_' . $assessment_id;
        $csv = new CSV($filename);
        return $csv->downloadResponses($query, $assessment, $answerDictionary);
    }

    /**
    * Export all attempts course-wide
    *
    * @param  string  $context_id
    * @param  int  $student_id (optional)
    * @return Response (CSV download)
    */

    public function exportCourseAttempts(Request $request, $context_id, $student_id = null)
    {
        $exportedAttempts = [];
        $includes = [
            'assessment',
            'assessment.questions',
            'student',
            'studentResponses',
            'lineItem'
        ];
        $courseContext = CourseContext::where('lti_context_id', '=', $context_id)->first();

        $query = Attempt::with($includes)
            ->where('course_context_id', '=', $courseContext->id);

        if ($student_id) {
            $query->where('student_id', '=', $student_id);
        }

        $query->orderBy('id'); //required by Laravel for chunking
        $filename = 'attempts';
        $csv = new CSV($filename);
        return $csv->downloadAttempts($query, $courseContext);
    }

    /**
    * Get all users and their associated groups in a Canvas course
    *
    * @param  int  $course_id
    * @return Response (CSV download)
    */

    public function getUsersInGroups($courseId)
    {
        $user = new User();
        $users = $user->getUsersInGroups($courseId);
        $filename = 'groups_' . $courseId;
        $csv = new CSV($filename);
        return $csv->download($users);
    }
}
