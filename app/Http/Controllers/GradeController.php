<?php

use Illuminate\Http\Request;
use App\Http\Requests;
use App\Classes\LTI\Grade;
use App\Classes\LTI\Outcome;
use App\Classes\LTI\LtiContext;
use App\Classes\ExternalData\CanvasAPI as CanvasAPI;
use App\Models\Attempt;
use App\Models\Student;
use App\Models\CourseContext;

class GradeController extends \BaseController
{
    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * Receive a max of 50 grades to pass back; front-end calculates score and sourcedIds,
    * Back-end simply passes to Canvas gradebook and returns both successful submissions
    * and submissions with errors.
    *
    * @return response (includes: array of successful submissions, and optionally, array of failed submissions)
    */
    public function autograde(Request $request)
    {
        $attempts = $request->input('attempts');
        $successfulSubmissions = array();
        $failedSubmissions = array();
        foreach ($attempts as $attempt) {
            $attemptId = $attempt['attemptId'];
            $attempt = Attempt::find($attemptId);
            //include student information on passback to client
            $student = Student::find($attempt->student_id);
            $attempt->student = $student;

            $grade = new Grade($attempt, $request);
            $result = $grade->submitGrade();
            $response = ['attempt' => $attempt->toArray(), 'score' => $attempt->getCalculatedScore()];
            if ($result === true) {
                array_push($successfulSubmissions, $response);
            }
            else {
                array_push($failedSubmissions, $response);
            }
        }

        if (count($failedSubmissions)) {
            //note: returning 200 status instead of 500 because there might have been some successful submissions
            return response()->error(200, [
                'reason' => 'There was an error sending grades to the gradebook.',
                'successfulSubmissions' => $successfulSubmissions,
                'failedSubmissions' => $failedSubmissions
            ]);
        }
        return response()->success([
            'successfulSubmissions' => $successfulSubmissions,
            'failedSubmissions' => $failedSubmissions
        ]);
    }

    /**
    * Get all grades for a set of attempts
    *
    * @param  int  $assessment_id
    * @param  string  $context_id
    * @param  int     $assignment_id
    * @return Response (includes: submissions in an associative array, indexed by user ID)
    */

    public function index($assessment_id, $context_id, $assignment_id = null, Request $request)
    {
        if (!$assessment_id || !$context_id) {
            return response()->error(400, ['An LTI context ID and/or assessment ID was not supplied in this request.']);
        }

        $courseContext = CourseContext::where('lti_context_id', '=', $context_id)->first();

        if (!$assignment_id) { //ungraded
            return response()->success(['submissions' => null]);
        }

        $courseId = $courseContext->getCourseId();
        $canvasAPI = new CanvasAPI;
        $submissions = $canvasAPI->getSubmissionsFromAPI($courseId, $assignment_id);
        return response()->success(['submissions' => $submissions]);
    }

    /**
    * Pass back a grade as a student when completing a graded assessment
    *
    * @param  int  $attemptId
    * @return Response
    */
    public function passback(Request $request)
    {
        $attemptGraded = false;
        $attemptId = $request->input('attemptId');
        $attempt = Attempt::findOrFail($attemptId);

        $grade = new Grade($attempt);
        if (!$grade->isReadyForGrade()) {
            $attemptGraded = false;
        }
        else if (!$grade->isGradePassbackEnabled()) {
            $attemptGraded = 'pending';
        }
        else {
            $result = $grade->submitGrade();
            $attemptGraded = 'graded';
        }

        return response()->success(['attemptGraded' => $attemptGraded]);
    }

    /**
    * Return submission information for a single student on a single assessment in a course
    *
    * @param  int  $assessmentId
    * @param  string  $contextId
    * @param  int  $studentId
    * @return Response (includes: submission in an associative array, indexed by user ID)
    */

    public function show(Request $request, $assessmentId, $contextId, $studentId)
    {
        if (!$assessmentId || !$contextId || !$studentId) {
            return response()->error(400, ['An LTI context ID, assessment ID, and/or student ID was not supplied in this request.']);
        }

        $courseContext = CourseContext::where('lti_context_id', '=', $contextId)->first();
        $assignmentId = Attempt::getAssignmentIdFromAttempts($courseContext, $assessmentId);

        if (!$assignmentId) { //ungraded
            return response()->success(['submissions' => null]);
        }

        $studentUserId = Student::find($studentId)->getCanvasUserId();
        $courseId = $courseContext->getCourseId();
        $canvasAPI = new CanvasAPI;
        $assignment = $canvasAPI->getAssignment($courseId, $assignmentId);
        $submission = $canvasAPI->getSubmissionFromAPI($courseId, $assignmentId, $studentUserId);

        return response()->success([
            'assignment' => $assignment,
            'submission' => $submission
        ]);
    }

    /**
    * Pass back a grade to the LMS (instructor)
    *
    * @return Response
    */

    public function store(Request $request)
    {
        $sourcedId = $request->input('sourcedId');
        $grade = $request->input('grade');
        $attempt = Attempt::where('lis_result_sourcedid', $sourcedId)->first();

        //a string of "0" is considered false in PHP, but we still want to check that a grade is supplied, and 0 is indeed
        //a valid grade, so we have to check for either a grade that evaluates to TRUE or a value of "0"
        if (!$sourcedId || (!$grade && $grade !== '0')) {
            return response()->error(400, ['A sourced ID and/or grade were not supplied in this request.']);
        }

        $outcome = new Outcome;
        $result = $outcome->sendGrade($sourcedId, $attempt, $grade, $request);
        if (!$result) {
            return response()->error(500, [$result]);
        }
        return response()->success();
    }
}
