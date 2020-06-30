<?php

namespace App\Classes\LTI;
use App\Classes\LTI\BLTI;
use App\Classes\LTI\LTIAdvantage;
use Log;
use Illuminate\Http\Request;
use App\Models\CourseContext;
use App\Models\Student;
use App\Models\User;
use App\Exceptions\LtiLaunchDataMissingException;

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

    /**
    * Get the Canvas course ID
    *
    * @return string
    */

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
    * @return string
    */

    public function getCourseOfferingSourcedid()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->lisKey]->course_offering_sourcedid;
    }

    /**
    * If a deep link request, we should redirect to this URL once the item has been selected.
    *
    * @return string
    */

    public function getDeepLinkingRedirectUrl()
    {
        if (!$this->launchValues) {
            return false;
        }

        $deepLinkSettings = $this->launchValues['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'];
        if (!$deepLinkSettings) {
            return false;
        }

        return $deepLinkSettings->deep_link_return_url;
    }

    /**
    * Get due at value for current launch
    *
    * @return string
    */

    public function getDueAt()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_assignment_dueat;
    }

    /**
    * Get student's given name for the current launch
    *
    * @return string
    */

    public function getGivenName()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues['given_name'];
    }

    /**
    * Get student's family name for the current launch
    *
    * @return string
    */

    public function getFamilyName()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues['family_name'];
    }

    /**
    * Get decoded launch values from JWT after it's been unencrypted
    *
    * @return []
    */

    public function getLaunchValues()
    {
        return $this->launchValues;
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
    * @return string
    */

    public function getResourceLinkId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->resourceLinkKey]->id;
    }

    /**
    * Get section ID for the current launch
    *
    * @return string
    */

    public function getSectionId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_coursesection_id;
    }

    /**
    * Get user's Canvas ID for the current launch
    *
    * @return string
    */

    public function getUserId()
    {
        if (!$this->launchValues) {
            return false;
        }

        return $this->launchValues[$this->customKey]->canvas_user_id;
    }

    /**
    * Get the user's login ID to Canvas from LTI context
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
    * Initialize a new LTI advantage context based on POST params
    *
    * @return void
    */

    public function initContext(Request $request)
    {
        $lti = new LTIAdvantage();
        $lti->validateLaunch();
        $launchValues = $lti->getLaunchValues();
        $this->setLaunchValues($launchValues);
        $this->validateLaunchParams();
        $this->initUserContext();
        $this->initCourseContext();
    }

    /**
    * Determine if we are in a BLTI context (otherwise, anonymous attempt)
    *
    * @return boolean
    */

    public function isInLtiContext()
    {
        if ($this->launchValues) {
            return true;
        }

        return false;
    }

    /**
    * Check for instructor/admin/designer in launch data
    *
    * @return boolean
    */

    public function isInstructor()
    {
        if (!$this->launchValues) {
            return false;
        }

        $roles = $this->launchValues[$this->rolesKey];
        foreach ($roles as $role) {
            $role = strtolower($role);
            if (strpos($role, 'membership#instructor')) {
                return true;
            }

            if (strpos($role, 'membership#contentdeveloper')) {
                return true;
            }

            if (strpos($role, 'administrator')) {
                return true;
            }
        }

        return false;
    }

    /**
    * Given an array of LTI launch values (after being decoded in JWT), set them on the object
    * for future calls to retrieve launch values
    *
    * @param  []  $launchValues
    * @return void
    */

    public function setLaunchValues($launchValues)
    {
        $this->launchValues = $launchValues;
    }

    /**
    * Ensure all required launch params are present; abort if not present
    *
    * @return void
    */

    public function validateLaunchParams()
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
    * Find existing instructor or create a new one if one does not yet exist
    *
    * @return void
    */

    private function initInstructorContext()
    {
        $loginId = $this->getUserLoginId();
        $user = User::getUserFromUsername($loginId);
        if (!$user) {
            $user = User::saveUser($loginId);
        }

        //M. Mallon, 6/3/20: add API token to model for existing users;
        //we'll have to rewrite this function or remove it later, but don't want to forget this logic
        if (!$user->getApiToken()) {
            $user->setApiToken();
        }
    }

    /**
    * Find existing student or create a new one if one does not yet exist
    *
    * @return void
    */

    private function initStudentContext()
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
    * Find existing student or create a new entry if one does not yet exist
    *
    * @return void
    */

    private function initUserContext()
    {
        if ($this->isInstructor()) {
            $this->initInstructorContext();
            return;
        }

        $this->initStudentContext();
    }
}
