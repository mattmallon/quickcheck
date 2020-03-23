<?php

namespace App\Classes\LTI;
use App\Classes\LTI\BLTI;
use App\Classes\LTI\LTIAdvantage;
use Session;
use Illuminate\Http\Request;
use App\Models\CourseContext;
use App\Models\Student;
use App\Exceptions\LtiLaunchDataMissingException;
use App\Exceptions\SessionMissingAssessmentDataException;
use App\Exceptions\SessionMissingStudentDataException;
use App\Exceptions\SessionMissingLtiContextException;

class LtiContext {

    private $assessmentsContextKey = 'currentAssessments';
    private $courseContextKey = 'courseContexts';
    private $studentContextKey = 'studentContext';
    private $requiredParams = [
        'context_id',
        'custom_canvas_course_id',
        'custom_canvas_user_id',
        'custom_canvas_user_login_id',
        'lis_person_name_family',
        'lis_person_name_given',
        'oauth_consumer_key',
        'user_id'
    ];

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * When recording a new attempt, and the user has made previous attempts on the
    * same assessment, we don't need a new LTI launch with post params; just grab
    * the existing data pertinent to this assessment already stored in the session.
    *
    * @param  int  $assessmentId
    * @return [] $attemptData
    */

    public function getAttemptDataFromSession(Request $request, $assessmentId)
    {
        //ensure LTI session is active
        $blti = new BLTI();
        $ltiSessionData = $blti->getSessionContext();
        if (!$ltiSessionData) {
            throw new SessionMissingLtiContextException;
        }

        $attemptData = $this->getAssessmentDataFromSession($request, $assessmentId);
        $attemptData['student_id'] = $this->getStudentIdFromSession($request);

        return $attemptData;
    }

    /**
    * Get current context
    *
    * @return string $context_id
    */

    public function getContextIdFromSession()
    {
        if (!$this->isInLtiContext()) {
            return false;
        }

        $blti = new BLTI();
        return $blti->getContextId();
    }

    /**
    * Get the course offering sourcedid for the current launch
    *
    * @param  int  $assessmentId
    * @return string
    */

    public function getCourseOfferingSourcedid($assessmentId)
    {
        return $this->getAssessmentValueFromSession($assessmentId, 'lis_course_offering_sourcedid');
    }

    /**
    * Get the nonce for the current launch
    *
    * @param  int  $assessmentId
    * @return string
    */

    public function getNonce($assessmentId)
    {
        return $this->getAssessmentValueFromSession($assessmentId, 'oauth_nonce');
    }

    /**
    * Get the person sourcedid for the current logged-in user
    *
    * @return string
    */

    public function getPersonSourcedid()
    {
        $studentData = Session::get($this->studentContextKey);

        if (!$studentData) {
            return false;
        }

        if (!array_key_exists('lis_person_sourcedid', $studentData)) {
            return false;
        }

        return $studentData['lis_person_sourcedid'];
    }

    /**
    * Get the resource link ID for the current launch
    *
    * @param  int  $assessmentId
    * @return string
    */

    public function getResourceLinkId($assessmentId)
    {
        return $this->getAssessmentValueFromSession($assessmentId, 'resource_link_id');
    }

    /**
    * Get the user's login ID to Canvas from BLTI session
    *
    * @return string $custom_canvas_user_login_id
    */

    public function getUserLoginId()
    {
        if (!$this->isInLtiContext()) {
            return false;
        }

        $student = Session::get($this->studentContextKey);
        if (!$student) {
            return false;
        }

        return $student['lti_custom_canvas_user_login_id'];
    }

    /**
    * Initialize the context for the assessment in the session; include all pertinent data
    * for recording an attempt, grade passback, etc. The information is indexed by assessment
    * ID. This makes it easy for the app to redirect after an LTI launch without passing a
    * tracking ID obtained from the database with all salient information, as previous iterations
    * of this app did. Keeping the information in the session allows for more flexibility when
    * a student is making multiple attempts; the tracking ID strategy sometimes resulted in bugs
    * when new tracking IDs needed to be generated, when LTI tool was opened in new tab, etc.
    *
    * @return void
    */

    public function initAssessmentContext(Request $request, $assessmentId)
    {
        if (!$request->session()->has($this->assessmentsContextKey)) {
            $request->session()->put($this->assessmentsContextKey, []);
        }

        $this->verifyUserId($request);
        $assessmentId = (string)$assessmentId;
        $currentAssessments = $request->session()->get($this->assessmentsContextKey);
        if (array_key_exists($assessmentId, $currentAssessments)) {
            //if assessment info already in session from previous attempt,
            //update the oauth nonce, which changes with every launch, then
            //verify that due at time is still the same (update if not) and return
            $this->updateNonce($request, $currentAssessments, $assessmentId);
            $this->verifyDueAt($request, $currentAssessments, $assessmentId);
            return;
        }

        $thisAssessment = [];
        $thisAssessment['lis_outcome_service_url'] = $request->lis_outcome_service_url;
        $thisAssessment['lti_custom_section_id'] = $request->custom_canvas_section_id;
        $thisAssessment['lti_custom_assignment_id'] = $request->custom_canvas_assignment_id;
        $thisAssessment['assignment_title']= $request->custom_canvas_assignment_title;

        //potentially no due_at if not a graded assignment
        if ($request->custom_canvas_assignment_dueat) {
            $thisAssessment['due_at'] = $request->custom_canvas_assignment_dueat;
        }
        //sourcedid will not exist if not a student or if not in a graded assignment
        if ($request->lis_result_sourcedid) {
            $thisAssessment['lis_result_sourcedid'] = $request->lis_result_sourcedid;
        }

        if (!$this->verifyCourseContext($request)) {
            $this->initCourseContext($request);
        }
        $thisAssessment['course_context_id'] = $this->getCourseContextIdFromSession($request);

        //data needed for Caliper events:
        $courseSisId = null;
        if ($request->has('lis_course_offering_sourcedid')) {
            $courseSisId = $request->lis_course_offering_sourcedid;
        }
        $thisAssessment['lis_course_offering_sourcedid'] = $courseSisId;
        $thisAssessment['oauth_nonce'] = $request->oauth_nonce;
        $thisAssessment['resource_link_id'] = $request->resource_link_id;

        $currentAssessments[$assessmentId] = $thisAssessment;
        $request->session()->put($this->assessmentsContextKey, $currentAssessments);
    }

    /**
    * Initialize a new BLTI class and start BLTI session based on POST params
    *
    * @return void
    */

    public function initContext(Request $request)
    {

        $lti = new LTIAdvantage();
        //original:
        // $secret = env('LTI_SECRET');
        // $context = new BLTI();
        // $this->validateLaunch($request); //ensure all LTI params are present before trying to initialize
        // $context->init($secret, $request, $this->requiredParams);
        // $this->initUserContext($request);
        // $this->initCourseContext($request);
    }

    /**
    * Determine if we are in a BLTI context (otherwise, anonymous attempt)
    *
    * @return boolean
    */

    public static function isInLtiContext()
    {
        $blti = new BLTI();
        if ($blti->isInLtiContext()) {
            return true;
        }

        return false;
    }

    /**
    * Check for instructor/admin/designer in session
    *
    * @return boolean
    */

    public static function isInstructor()
    {
        $blti = new BLTI();
        $isInstructor = $blti->isInstructor();
        //also include course designer role, for instructional designers/developers
        $isDesigner = $blti->isDesigner();
        $allowAccess = $isInstructor || $isDesigner ? true : false;
        return $allowAccess;
    }

    /**
    * Ensure all required launch params are present; abort if not present
    *
    * @param  Request  $request
    * @return void
    */

    public function validateLaunch(Request $request)
    {
        $blti = new BLTI();
        if (!$blti->isLtiDataPresent($request, $this->requiredParams)) {
            throw new LtiLaunchDataMissingException;
        }
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Utility function to get a value from the BLTI session
    *
    * @param  int  $assessmentId
    * @param  string  $key
    * @return mixed
    */

    private function getAssessmentValueFromSession($assessmentId, $key)
    {
        if (!Session::has($this->assessmentsContextKey)) {
            return false;
        }

        $currentAssessments = Session::get($this->assessmentsContextKey);
        if (!array_key_exists($assessmentId, $currentAssessments)) {
            return false;
        }

        if (!array_key_exists($key, $currentAssessments[$assessmentId])) {
            return false;
        }

        return $currentAssessments[$assessmentId][$key];
    }

    /**
    * Get data specific to an assessment from the session
    *
    * @param  Request  $request
    * @param  int  $assessmentId
    * @return [] $assessmentData
    */

    private function getAssessmentDataFromSession($request, $assessmentId)
    {
        $assessmentId = (string)$assessmentId; //make sure we can fetch by key
        if (!$request->session()->has($this->assessmentsContextKey)) {
            throw new SessionMissingAssessmentDataException;
        }
        $currentAssessments = $request->session()->get($this->assessmentsContextKey);
        if (!array_key_exists($assessmentId, $currentAssessments)) {
            throw new SessionMissingAssessmentDataException;
        }
        $assessmentData = [];
        $assessmentData['assessment_id'] = $assessmentId;
        $assessmentData['last_milestone'] = "LTI Launch";
        $assessmentSessionData = $currentAssessments[$assessmentId];
        $assessmentData['course_context_id'] = $assessmentSessionData['course_context_id'];
        $assessmentData['lis_outcome_service_url'] = $assessmentSessionData['lis_outcome_service_url'];
        $assessmentData['lti_custom_section_id'] = $assessmentSessionData['lti_custom_section_id'];
        $assessmentData['lti_custom_assignment_id'] = $assessmentSessionData['lti_custom_assignment_id'];
        $assessmentData['assignment_title'] = $assessmentSessionData['assignment_title'];

        //due at may not be there if not a graded assignment
        if (array_key_exists('due_at', $assessmentSessionData)) {
            $assessmentData['due_at'] = $assessmentSessionData['due_at'];
        }

        //sourcedid will not exist if not a student
        if (array_key_exists('lis_result_sourcedid', $assessmentSessionData)) {
            $assessmentData['lis_result_sourcedid'] = $assessmentSessionData['lis_result_sourcedid'];
        }
        return $assessmentData;
    }

    /**
    * Get cached course context Id from session
    *
    * @return int $courseContextId
    */

    private function getCourseContextIdFromSession(Request $request) {
        $courseContexts = $request->session()->get($this->courseContextKey);
        $courseContextId = false;

        foreach($courseContexts as $courseContext) {
            if ($courseContext['lti_context_id'] == $request->context_id) {
                $courseContextId = $courseContext['id'];
            }
        }

        return $courseContextId;
    }

    /**
    * Get cached student ID from session
    *
    * @return int $studentID
    */

    private function getStudentIdFromSession(Request $request) {
        $student = $request->session()->get($this->studentContextKey);
        $studentId = $student['id'];
        if (!$studentId) {
            throw new SessionMissingStudentDataException;
        }

        return $studentId;
    }

    /**
    * Find existing course context or create a new one if one does not yet exist;
    * keep a list of courses in the session for fast retrieval when saving new attempts
    *
    * @return void
    */

    private function initCourseContext($request)
    {
        if (!$request->session()->has($this->courseContextKey)) {
            $request->session()->put($this->courseContextKey, []);
        }

        $ltiContextId = $request->context_id;
        $courseContext = CourseContext::where('lti_context_id', '=', $ltiContextId)->first();
        if (!$courseContext) {
            $courseContext = new CourseContext();
            $courseContext->initialize($request);
        }

        $currentCourseContexts = $request->session()->get($this->courseContextKey);
        array_push($currentCourseContexts, $courseContext->toArray());
        $request->session()->put($this->courseContextKey, $currentCourseContexts);
    }


    /**
    * Find existing student or create a new entry if one does not yet exist;
    * keep the student ID in the session for fast retrieval when saving new attempts
    *
    * @return void
    */

    private function initUserContext($request)
    {
        $canvasUserId = $request->custom_canvas_user_id;
        $student = Student::where('lti_custom_user_id', '=', $canvasUserId)->first();
        if (!$student) {
            $student = new Student();
            $student->initialize($request);
        }

        $userData = $student->toArray();
        //needed this piece of data for Caliper events
        $userData['lis_person_sourcedid'] = $request->lis_person_sourcedid;
        $request->session()->put($this->studentContextKey, $userData);
    }

    /**
    * Update nonce in session when assessment is re-launched.
    *
    * @param  Request  $request
    * @param  []  $currentAssessments
    * @param  int $assessmentId
    * @return void
    */

    private function updateNonce(Request $request, $currentAssessments, $assessmentId)
    {
        $currentAssessments[$assessmentId]['oauth_nonce'] = $request->oauth_nonce;
        $request->session()->put($this->assessmentsContextKey, $currentAssessments);
    }

    /**
    * Verify that course context is initialized in session;
    * if student is in multiple courses simultaneously, we may
    * need to initialize a new course context to add to the list
    *
    * @param  Request  $request
    * @return void
    */

    private function verifyCourseContext(Request $request) {
        $courseContexts = $request->session()->get($this->courseContextKey);
        $contextFound = false;

        if (!$courseContexts) {
            return false;
        }

        foreach($courseContexts as $courseContext) {
            if ($courseContext['lti_context_id'] == $request->context_id) {
                $contextFound = true;
            }
        }

        return $contextFound;
    }

    /**
    * Verify that due at time in the session for an assessment is still valid;
    * if an instructor updated the due at time mid-attempt, it may need to be renewed
    *
    * @param  Request  $request
    * @param  []  $currentAssessments
    * @param  int $assessmentId
    * @return void
    */

    private function verifyDueAt(Request $request, $currentAssessments, $assessmentId)
    {
        $sessionDueAt = false; //default to false, if not previously set
        $ltiDueAt = $request->custom_canvas_assignment_dueat;
        $assessment = $currentAssessments[$assessmentId];

        if (array_key_exists('due_at', $assessment)) {
            $sessionDueAt = $assessment['due_at'];
        }

        if ($sessionDueAt == $ltiDueAt) {
            return; //no changes
        }

        if (!$ltiDueAt) { //if changed to remove due at
            unset($currentAssessments[$assessmentId]['due_at']);
        }
        else { //if due at altered or added
            $currentAssessments[$assessmentId]['due_at'] = $ltiDueAt;
        }

        $request->session()->put($this->assessmentsContextKey, $currentAssessments);
    }

    /**
    * Verify that the user in the session has not changed; this will only occur if an
    * instructor is accessing via Canvas student view or vice versa
    *
    * @param  Request  $request
    * @return void
    */

    private function verifyUserId(Request $request) {
        if ($this->getUserLoginId() !== $request->custom_canvas_user_login_id) {
            $this->initUserContext($request); //reset user context in session
            //reset assessments context in session
            $request->session()->put($this->assessmentsContextKey, []);
        }
    }
}
