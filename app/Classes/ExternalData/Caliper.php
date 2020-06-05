<?php

namespace App\Classes\ExternalData;

use App;
use App\Classes\LTI\LtiContext;

class Caliper
{
    private $baseIdUrl;
    private $isEnabled;
    private $sensorHost;

    public function __construct()
    {
        $this->isEnabled = env('CALIPER_ENABLED', false);
        $this->sensorHost = env('CALIPER_SENSOR_HOST', null);
        $this->baseIdUrl = env('APP_URL') . '/api/caliper/';
    }

    /**
    * Build base data structure for sending to the front-end
    *
    * @param  string  $action
    * @param  Attempt $attempt
    * @return mixed (array on success, null if unable to build event)
    */

    public function buildBaseEventData($action, $attempt)
    {
        if ($attempt->isAnonymous()) { //if no LTI data, can't build Caliper event
            return null;
        }

        $eventData = [];
        $eventData['isEnabled'] = $this->isEnabled();
        $eventData['sensorHost'] = $this->sensorHost;
        $eventData['data'] = $this->getAssessmentEventData($action, $attempt);
        return $eventData;
    }

    /**
    * Build data needed for a started action
    *
    * @param  Attempt $attempt
    * @return []
    */

    public function buildAssessmentStartedEventData($attempt)
    {
        $action = 'Started';
        $eventData = $this->buildBaseEventData($action, $attempt);
        return $eventData;
    }

    /**
    * Build data needed for a submitted action
    *
    * @param  Attempt $attempt
    * @return []
    */

    public function buildAssessmentSubmittedEventData($attempt)
    {
        $action = 'Submitted';
        $eventData = $this->buildBaseEventData($action, $attempt);
        return $eventData;
    }

    /**
    * Determine if Caliper is enabled in the app environment
    *
    * @return boolean
    */

    public function isEnabled()
    {
        if (!$this->isEnabled) {
            return false;
        }

        if (!$this->sensorHost) {
            return false;
        }

        //more info on filter_var for ensuring we have a valid url defined:
        //http://php.net/manual/en/function.filter-var.php
        if (!filter_var($this->sensorHost, FILTER_VALIDATE_URL)) {
            return false;
        }

        //if in prod, enabled in env, and sensor host defined/valid, we're good to go
        return true;
    }

    /**
    * Return data needed to send Caliper assessment event data to front-end for send-off.
    *
    * @param  string  $action
    * @param  Attempt $attempt
    * @return []
    */

    private function getAssessmentEventData($action, $attempt)
    {
        $assessmentId = $attempt->getAssessmentId();
        $student = $attempt->student;
        $courseContext = $attempt->courseContext;
        $data = [];

        $data['type'] = 'assessment';
        $data['action'] = $action;
        $data['userId'] = $this->baseIdUrl . 'student/' . $attempt->getStudentId();
        $data['assessmentId'] = $this->baseIdUrl . 'assessment/' . $assessmentId;
        $data['timestamp'] = $attempt->updated_at->getTimeStamp();
        $data['attemptId'] = $this->baseIdUrl . 'attempt/' . $attempt->id;
        $data['appUrl'] = env('APP_URL');
        $data['custom_canvas_assignment_id'] = $attempt->getAssignmentId();
        $data['custom_canvas_course_id'] = $courseContext->getCourseId();
        $data['custom_canvas_user_id'] = $student->getCanvasUserId();
        $data['custom_canvas_user_login_id'] = $student->getCanvasUserLoginId();
        $data['ltiConsumerUrl'] = $attempt->getLtiConsumerUrl();
        $data['ltiNonce'] = $attempt->getNonce();
        $data['lis_course_offering_sourcedid'] = $courseContext->getCourseOfferingSourcedid();
        $data['lis_person_sourcedid'] = $student->getLisPersonSourcedId();
        $data['resource_link_id'] = $attempt->getResourceLinkId();

        return $data;
    }
}