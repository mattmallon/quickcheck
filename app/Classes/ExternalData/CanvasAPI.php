<?php

namespace App\Classes\ExternalData;
use App;
use Log;

class CanvasAPI
{
    private $apiToken;
    private $canvasDomain;
    private $canvasHeader;
    private $submissions = [];
    private $users = [];

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    public function __construct()
    {
        $this->apiToken = env('CANVAS_API_TOKEN');
        $this->canvasDomain = env('CANVAS_API_DOMAIN');
        $this->canvasHeader = env('CANVAS_API_HEADER', 'Authorization: Bearer ');
    }

    /**
    * Get assignment from Canvas API
    *
    * @param  int  $courseId
    * @param  int  $assignmentId
    * @return [] $assignment
    */

    public function getAssignment($courseId, $assignmentId)
    {
        $assignmentUrl = $this->canvasDomain . '/courses/' . $courseId . '/assignments/' . $assignmentId;
        $JSONresponse = $this->curlGet($assignmentUrl, $this->apiToken, false, false, false);

        $assignment = $this->getResponseBody($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($assignment);

        if ($errorMessage) {
            abort(500, 'Error retrieving assignment from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        //convert dueAt from ISO8601 to Unix timestamp
        if (array_key_exists('due_at', $assignment)) { //only convert to time if there is a due date
            $assignment['due_at'] = date("U", strtotime($assignment['due_at']));
        }

        return $assignment;
    }

    /**
    * Get the due date for an assignment -- used for student view, since we don't want
    * to fetch ALL submissions for the course to get the due date
    *
    * @param  int  $courseId
    * @param  int  $assignmentId
    * @return string $due_at (Unix timestamp)
    */

    public function getAssignmentDueAt($courseId, $assignmentId)
    {
        $assignment = $this->getAssignment($courseId, $assignmentId);
        return $assignment['due_at'];
    }

    /**
    * Get a Canvas course
    * @param  int  $courseId
    * @return []  $course
    */

    public function getCourse($courseId, $includeStudentCount = false)
    {
        $courseUrl = $this->canvasDomain . '/courses/' . $courseId;
        if ($includeStudentCount) {
            $includeStudentCount = 'total_students'; //specify what to include from API
        }
        $JSONresponse = $this->curlGet($courseUrl, $this->apiToken, false, $includeStudentCount, false);

        $course = $this->getResponseBody($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($course);

        if ($errorMessage) {
            abort(500, 'Error retrieving course from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        return $course;
    }

    /**
    * Get groups in a Canvas course
    *
    * @param  int  $courseId
    * @return [] $courseGroups
    */

    public function getCourseGroups($courseId)
    {
        $courseGroupsUrl = $this->canvasDomain . '/courses/' . $courseId . '/groups';
        $JSONresponse = $this->curlGet($courseGroupsUrl, $this->apiToken, '100', false, false);

        $courseGroups = $this->getResponseBody($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($courseGroups);

        if ($errorMessage) {
            abort(500, 'Error retrieving course groups from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        return $courseGroups;
    }

    /**
    * Get all users within a Canvas group
    *
    * @param  int  $groupId
    * @return [] $groupUsers
    */

    public function getGroupUsers($groupId)
    {
        $groupUsersUrl = $this->canvasDomain . '/groups/' . $groupId . '/users';
        $JSONresponse = $this->curlGet($groupUsersUrl, $this->apiToken, '100', false, false);

        $groupUsers = $this->getResponseBody($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($groupUsers);

        if ($errorMessage) {
            abort(500, 'Error retrieving group users from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        return $groupUsers;
    }

    /**
    * Get submission for a single student on a single assessment from the API.
    * Return in a hash indexed by user ID, to be consistent with other submission
    * endpoint.
    *
    * @param  int  $courseId
    * @param  int  $assignmentId
    * @param  int  $studentUserId
    * @return [] $submissionsHash
    */

    public function getSubmissionFromAPI($courseId, $assignmentId, $userId)
    {
        $submission = $this->getSubmission($courseId, $assignmentId, $userId);
        $submissionHash = [];
        $submissionHash[$userId] = $submission;
        return $submissionHash;
    }

    /**
    * Get submissions for an assignment from the Canvas API, to more quickly fetch grades
    * in manage view, compared to fetching each grade individually using the Outcome model.
    * Returns an associative array where user_id is used as a key, to look up the grade for
    * a student in O(1) constant time. [It does take O(N) time to loop through API array and
    * create new array by key, vs. ~O(N^2) time if we instead just looped through original
    * array to look for the user id on a per-student basis.]
    *
    * @param  int  $courseId
    * @param  int  $assignmentId
    * @return [] $submissionsHash
    */

    public function getSubmissionsFromAPI($courseId, $assignmentId)
    {
        $paginationNumber = false; //i.e, ?page=2 if link in header; no pagination for first API call
        $this->getSubmissions($courseId, $assignmentId, $paginationNumber); //submissions assigned to $this->submissions
        $submissionsHash = array();
        foreach($this->submissions as $submission) {
            //assign user id as key, for quick lookup; just a single submission (the most current) is returned from API
            $user_id = $submission['user_id'];
            $submissionsHash[$user_id] = $submission;
        }
        return $submissionsHash;
    }

    /**
    * Get a user from a course to determine if they are still a member. Return in same format
    * as getUsersFromAPI(), as a hash with user ID as key, for consistency.
    *
    * @param  int  $courseId
    * @param  int  $userId
    * @return [] $usersHash
    */

    public function getUserFromAPI($courseId, $userId)
    {
        $user = $this->getUser($courseId, $userId);
        $userHash = [];
        $userHash[$userId] = $user;
        return $userHash;
    }

    /**
    * Get a user, querying by SIS login ID
    *
    * @param  string  $username
    * @return [] $user
    */

    public function getUserFromAPIBySISLogin($username)
    {
        $userUrl = $this->canvasDomain . '/users/sis_login_id:' . $username;
        $JSONresponse = $this->curlGet($userUrl, $this->apiToken);

        $user = $this->getResponseBody($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($user);

        if ($errorMessage) {
            Log::info('Error retrieving user from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        return $user;
    }

    /**
    * Get list of students in the course from the Canvas API, so we can check for
    * students who dropped. Returns associative array where user_id is used as a key,
    * to look up the student in O(1) constant time. [It does take O(N) time to loop
    * through API array and create new array by key, vs. ~O(N^2) time if we instead
    * just looped through original array to look for the user id on a per-student basis.]
    *
    * @param  int  $courseId
    * @return [] $usersHash
    */

    public function getUsersFromAPI($courseId)
    {
        $paginationNumber = false; //i.e, ?page=2 if link in header; no pagination for first API call
        $this->getUsers($courseId, $paginationNumber); //assigned to $this->users
        $usersHash = [];
        foreach($this->users as $user) {
            //assign user id as key, for quick lookup
            $user_id = $user['id'];
            $usersHash[$user_id] = $user;
        }
        return $usersHash;
    }

    /**
    * Given a user, what Canvas group do they belong to? Used for custom activity differentiation.
    *
    * @param  int  $courseId
    * @param  int  $userId
    * @return string
    */

    public function getUserGroup($courseId, $userId)
    {
        $courseGroups = $this->getCourseGroups($courseId);
        if (!$courseGroups) {
            return false;
        }

        //list each group's users
        foreach ($courseGroups as $courseGroup) {
            $groupUsers = $this->getGroupUsers($courseGroup['id']);
            foreach ($groupUsers as $groupUser) {
                if ($groupUser['id'] == $userId) {
                    return $courseGroup['name'];
                }
            }
        }
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Determine if an API error was found in the response
    *
    * @param  []   $response
    * @return mixed (string of error message if found, otherwise false if no error found)
    */

    private function getApiError($response)
    {
        $errorMessage = '';

        if ($response === null || $response === false || $response === '') {
            return 'No response returned from Canvas. Canvas servers may be experiencing issues.';
        }

        if (array_key_exists('errors', $response)) {
            foreach ($response['errors'] as $error) {
                $errorMessage .= $error['message'];
            }

            return $errorMessage;
        }

        return false;
    }

    /**
    * Get a single submission for a student on an assignment from the Canvas API
    *
    * @param  int  $courseId
    * @param  int  $assignmentId
    * @param  int  $userId
    * @return []
    */

    private function getSubmission($courseId, $assignmentId, $userId)
    {
        $submissionUrl = $this->canvasDomain . '/courses/' . $courseId . '/assignments/' . $assignmentId . '/submissions/' . $userId;
        $JSONresponse = $this->curlGet($submissionUrl, $this->apiToken, false, 'assignment');

        $submission = $this->getResponseBody($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($submission);

        if ($errorMessage) {
            abort(500, 'Error retrieving submission from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        return $submission;
    }

    /**
    * Get submissions from Canvas API; function called recursively if pagination required.
    * Submissions are added to a class member variable rather than returned directly.
    *
    * @param  int  $courseId
    * @param  int  $assignmentId
    * @param  int  $paginationNumber
    * @return void
    */

    private function getSubmissions($courseId, $assignmentId, $paginationNumber)
    {
        //get all submissions for this assignment
        $submissionsUrl = $this->canvasDomain . '/courses/' . $courseId . '/assignments/' . $assignmentId . '/submissions';
        //returns both the header and the body of the API response, so we can determine if pagination is needed
        $JSONresponse = $this->curlGet($submissionsUrl, $this->apiToken, '100', 'assignment', $paginationNumber);

        $submissions = $this->getResponseBody($JSONresponse);
        $header = $this->getResponseHeader($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($submissions);

        if ($errorMessage) {
            abort(500, 'Error retrieving submissions from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        //combine previous submissions (if any) and current submissions
        $allSubmissions = array_merge($this->submissions, $submissions);
        $this->submissions = $allSubmissions;
        //if there are additional pages, use recursion to continue getting them and add them on to $this->submissions
        if ($this->getPagination($header)) {
            //if we are continuing down the recursion path, add another page to pagination count;
            //otherwise, if this is the first iteration of a possible recursion, then start with the second page
            if ($paginationNumber) {
                $paginationNumber = intval($paginationNumber) + 1;
            }
            else {
                $paginationNumber = '2';
            }
            $this->getSubmissions($courseId, $assignmentId, $paginationNumber);
        }
        else {
            return;
        }
    }

    /**
    * Get user in a Canvas course
    *
    * @param  int  $courseId
    * @return []   $user
    */

    private function getUser($courseId, $userId)
    {
        $userUrl = $this->canvasDomain . '/courses/' . $courseId . '/users/' . $userId;
        $JSONresponse = $this->curlGet($userUrl, $this->apiToken);

        $user = $this->getResponseBody($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($user);

        if ($errorMessage) {
            abort(500, 'Error retrieving user from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        return $user;
    }

    /**
    * Get users in a Canvas course; may be called recursively if pagination involved
    * Users are added to a class member variable rather than returned from this function
    *
    * @param  int  $courseId
    * @param  int  $paginationNumber
    * @return void
    */

    private function getUsers($courseId, $paginationNumber)
    {
        //get all users in the course
        $usersUrl = $this->canvasDomain . '/courses/' . $courseId . '/users';
        //returns both the header and the body of the API response, so we can determine if pagination is needed
        $JSONresponse = $this->curlGet($usersUrl, $this->apiToken, '600', false, $paginationNumber);

        $users = $this->getResponseBody($JSONresponse);
        $header = $this->getResponseHeader($JSONresponse);

        // See if error exists
        $errorMessage = $this->getApiError($users);

        if ($errorMessage) {
            abort(500, 'Error retrieving users from the Canvas API. Canvas API returned: ' . $errorMessage);
        }

        //combine previous submissions (if any) and current submissions
        $allUsers = array_merge($this->users, $users);
        $this->users = $allUsers;
        //if there are additional pages, use recursion to continue getting them and add them on to $this->submissions
        if ($this->getPagination($header)) {
            //if we are continuing down the recursion path, add another page to pagination count;
            //otherwise, if this is the first iteration of a possible recursion, then start with the second page
            if ($paginationNumber) {
                $paginationNumber = intval($paginationNumber) + 1;
            }
            else {
                $paginationNumber = '2';
            }
            $this->getUsers($courseId, $paginationNumber);
        }
        else {
            return;
        }
    }

    /**
    * Utility function to perform a curl GET request
    *
    * @param  string  $url
    * @param  string  $apiToken
    * @param  int  $perPage
    * @param  string  $includes
    * @param  int  $pagination
    * @return [] $response
    */

    private function curlGet($url, $apiToken, $perPage = false, $includes = false, $pagination = false)
    {
        $tokenHeader = [$this->canvasHeader . $apiToken];
        if ($perPage) {
            $url = $url . '?per_page=' . $perPage;
        }
        else { //default of 100 for pagination
            $url = $url . '?per_page=100';
        }
        if ($includes) {
            $url = $url . '&' . urlencode('include[]') . '=' . $includes;
        }
        if ($pagination) {
            $url = $url . '&page=' . $pagination;
        }
        $ch = curl_init($url);
        curl_setopt ($ch, CURLOPT_URL, $url);
        curl_setopt ($ch, CURLOPT_HTTPHEADER, $tokenHeader);
        curl_setopt ($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // ask for results to be returned

        // Send to remote and return data to caller.
        $response = curl_exec($ch);
        curl_close($ch);
        return $response;
    }

    /**
    * Nitty gritty functionality to find pagination links from header of Canvas API returns
    *
    * @param  string  $header
    * @return boolean
    */

    /*
    The nitty gritty functionality needed to find pagination links from the header the Canvas API returns
    Returns boolean on whether pagination is needed
    */
    private function getPagination($header)
    {
        $header_info = $this->http_parse_headers($header);
        if (!array_key_exists('Link', $header_info)) {
            return false;
        }
        $link_info = explode(';',$header_info['Link']);
        $next_page = explode(',',$link_info[2]);

        if (strpos($next_page[0],'next')) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
    * Another nitty gritty utility function to parse headers for pagination links
    *
    * @param  string  $header
    * @return string
    */

    private function http_parse_headers($header)
    {
        $retVal = array();
        $fields = explode("\r\n", preg_replace('/\x0D\x0A[\x09\x20]+/', ' ', $header));
        foreach( $fields as $field ) {
            if( preg_match('/([^:]+): (.+)/m', $field, $match) ) {
                $match[1] = preg_replace_callback('/(?<=^|[\x09\x20\x2D])./',
                    function($matches) { return strtoupper($matches[0]); }, strtolower(trim($match[1])));
                if( isset($retVal[$match[1]]) ) {
                    $retVal[$match[1]] = array($retVal[$match[1]], $match[2]);
                } else {
                    $retVal[$match[1]] = trim($match[2]);
                }
            }
        }
        return $retVal;
    }

    private function getResponseHeader($jsonResponse) {
        $responseHeader = null;

        $splitArray = explode("\r\n\r\n", $jsonResponse, 2);

        $responseHeader = $splitArray[0];

        return $responseHeader;
    }

    private function getResponseBody($jsonResponse) {

        if (!$jsonResponse) {
            abort(500, 'Error contacting the Canvas API.');
        }

        $body = null;
        $splitArray = explode("\r\n\r\n", $jsonResponse, 2); //assigns header and body to the right portions of the response
        $body = $splitArray[1];

        $responseBody = json_decode($body, true);

        return $responseBody;
    }
}
