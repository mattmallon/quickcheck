<?php

namespace App\Classes\LTI;
use App\Classes\LTI\BLTI;
use App\Classes\LTI\LTIAdvantage;
use Log;
use Session;
use Illuminate\Http\Request;
use App\Models\CourseContext;
use App\Models\Student;
use App\Exceptions\LtiLaunchDataMissingException;
use App\Exceptions\SessionMissingAssessmentDataException;
use App\Exceptions\SessionMissingStudentDataException;

class LtiContext {

    private $contextKey = "https://purl.imsglobal.org/spec/lti/claim/context";
    private $customKey = "https://purl.imsglobal.org/spec/lti/claim/custom";
    private $lisKey = "https://purl.imsglobal.org/spec/lti/claim/lis";
    private $namesRolesServiceKey = "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice";
    private $resourceLinkKey = "https://purl.imsglobal.org/spec/lti/claim/resource_link";
    private $rolesKey = "https://purl.imsglobal.org/spec/lti/claim/roles";

    private $launchValues = [];

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    public function getAssignmentId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_assignment_id;
    }

    public function getAssignmentTitle()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_assignment_title;
    }

    /**
    * When recording a new attempt, and the user has made previous attempts on the
    * same assessment, we don't need a new LTI launch with post params; just grab
    * the existing data pertinent to this assessment already stored in the session.
    *
    * @param  int  $assessmentId
    * @return [] $attemptData
    */

   //TODO: delete this function after new structure is in place to create attempt with launch values

    public function getAttemptDataFromSession(Request $request, $assessmentId)
    {
        //ensure LTI session is active
        $blti = new BLTI();
        $ltiSessionData = $blti->getSessionContext();
        if (!$ltiSessionData) {
            //throw new SessionMissingLtiContextException;
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

    public function getContextId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->contextKey]->id;
    }

    public function getCourseId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_course_id;
    }

    /**
    * Get the course offering sourcedid for the current launch
    *
    * @param  int  $assessmentId
    * @return string
    */

    public function getCourseOfferingSourcedid()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->lisKey]->course_offering_sourcedid;
    }

    public function getDueAt()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_assignment_dueat;
    }

    public function getGivenName()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues['given_name'];
    }

    public function getFamilyName()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues['family_name'];
    }

    /**
    * Get the nonce for the current launch
    *
    * @param  int  $assessmentId
    * @return string
    */

    public function getNonce()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues['nonce'];
    }

    /**
    * Get the person sourcedid for the current logged-in user
    *
    * @return string
    */

    public function getPersonSourcedid()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->lisKey]->person_sourcedid;
    }

    /**
    * Get the resource link ID for the current launch
    *
    * @param  int  $assessmentId
    * @return string
    */

    public function getResourceLinkId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->resourceLinkKey]->id;
    }

    public function getSectionId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_coursesection_id;
    }

    public function getUserId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_user_id;
    }

    /**
    * Get the user's login ID to Canvas from BLTI session
    *
    * @return string $custom_canvas_user_login_id
    */

    public function getUserLoginId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_user_login_id;
    }

    /**
    * Initialize a new BLTI class and start BLTI session based on POST params
    *
    * @return void
    */

    public function initContext(Request $request)
    {
        $lti = new LTIAdvantage();
        $this->launchValues = $lti->getLaunchValues();
        $this->validateLaunch();
        $this->initUserContext();
        $this->initCourseContext();
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
    * @return void
    */

    public function validateLaunch()
    {
        $missingValue = false;
        $logMessage = 'LTI launch data missing for the following value: ';

        if (!$this->getContextId()) {
            Log::info($logMessage + 'context ID');
            $missingValue = true;
        }

        if (!$this->getCourseId()) {
            Log::info($logMessage + 'course ID');
            $missingValue = true;
        }

        if (!$this->getUserId()) {
            Log::info($logMessage + 'user ID');
            $missingValue = true;
        }

        if (!$this->getUserLoginId()) {
            Log::info($logMessage + 'user login ID');
            $missingValue = true;
        }

        if (!$this->getGivenName()) {
            Log::info($logMessage + 'given name');
            $missingValue = true;
        }

        if ($missingValue) {
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
    * Find existing course context or create a new one if one does not yet exist
    *
    * @return void
    */

    private function initCourseContext()
    {
        $ltiContextId = $this->getContextId();
        $courseContext = CourseContext::where('lti_context_id', '=', $ltiContextId)->first();
        if (!$courseContext) {
            $courseContext = new CourseContext();
            $courseId = $this->getCourseId();
            $sourcedId = $this->getCourseOfferingSourcedid();
            $courseContext->initialize($ltiContextId, $courseId, $sourcedId);
        }

        //M. Mallon, 5/26/20: course sourced ID was not being previously saved, may need to update existing courses in DB;
        //we can remove this in the future after a semester or two
        if (!$courseContext->getCourseOfferingSourcedid()) {
            $sourcedId = $this->getCourseOfferingSourcedid();
            $courseContext->setCourseOfferingSourcedid($sourcedId);
        }
    }


    /**
    * Find existing student or create a new entry if one does not yet exist;
    * keep the student ID in the session for fast retrieval when saving new attempts
    *
    * @return void
    */

    private function initUserContext()
    {
        $canvasUserId = $this->getUserId();
        $student = Student::where('lti_custom_user_id', '=', $canvasUserId)->first();
        if (!$student) {
            $student = new Student();
            $givenName = $this->getGivenName();
            $familyName = $this->getFamilyName();
            $canvasUserId = $this->getUserId();
            $canvasLoginId = $this->getUserLoginId();
            $personSourcedId = $this->getPersonSourcedid();
            $student->initialize($givenName, $familyName, $canvasUserId, $canvasLoginId, $personSourcedId);
        }

        //M. Mallon, 5/26/20: person sourced ID was not previously saved, so add to existing users if needed.
        //in the future, we can remove this when we're pretty confident we only have new/updated user cohorts.
        if (!$student->getLisPersonSourcedId()) {
            $sourcedId = $this->getPersonSourcedid();
            $student->setLisPersonSourcedId($sourcedId);
        }

        //similar story as above for API tokens
        if (!$student->getApiToken()) {
            $student->setApiToken();
        }
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
}
