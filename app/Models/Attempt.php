<?php
namespace App\Models;
use DateTime;
use Illuminate\Database\Eloquent\Model as Eloquent;
use Illuminate\Http\Request;
use App\Classes\ExternalData\CanvasAPI;
use App\Classes\ExternalData\Caliper;
use App\Models\CollectionFeature;
use App\Models\CourseContext;
use App\Models\LineItem;
use App\Models\Student;
use App\Classes\LTI\LtiContext;
use App\Exceptions\MissingLtiContextException;
use Illuminate\Support\Facades\Cache;

class Attempt extends Eloquent {
    protected $table = 'attempts';
    protected $fillable = ['assessment_id',
                            'course_context_id',
                            'student_id',
                            'line_item_id',
                            'lti_custom_section_id',
                            'last_milestone',
                            'count_correct',
                            'count_incorrect',
                            'calculated_score',
                            'complete',
                            'assignment_title',
                            'due_at'
                            ];

    //class variables
    public $optionalParams = ['last_milestone', 'count_correct', 'count_incorrect', 'complete', 'calculated_score'];

    //constants
    public $MILESTONE_CREATED = 'Attempt created';
    public $MILESTONE_LTI_LAUNCH = 'LTI launch';
    public $MILESTONE_ANONYMOUS_LAUNCH = 'Anonymous launch';
    public $TIMEOUT_BOUNDARY = '1 minute';
    public $TIMEOUT_MAX_COUNT = 2;
    public $TIMEOUT_MILESTONE = 'timeout';
    public $TIMEOUT_LENGTH = '2 minutes';
    public $TIMEOUT_CACHE_KEY = 'timeoutEnd-';

    public function assessment() {
        return $this->belongsTo('App\Models\Assessment');
    }

    public function courseContext() {
        return $this->belongsTo('App\Models\CourseContext');
    }

    public function student() {
        return $this->belongsTo('App\Models\Student');
    }

    public function studentResponses() {
        return $this->hasMany('App\Models\StudentResponse');
    }

    public function lineItem() {
        return $this->belongsTo('App\Models\LineItem');
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Given a chunk of attempts with related data, export an array amenable to CSV export
    *
    * @param  Collection     $attempts
    * @param  CourseContext  $courseContext
    * @return []
    */

    public static function formatExport($attempts, $courseContext) {
        $attempts = $attempts->toArray();
        $courseContext = $courseContext->toArray();
        $courseData = CourseContext::formatExport($courseContext);
        $formattedAttempts = [];

        foreach ($attempts as $attempt) {
            //get count correct/count incorrect based on responses;
            $responses = $attempt['student_responses'];
            //custom activities may set the count correct/incorrect manually, so don't overwrite it; only write if not included
            if (!$attempt['count_correct'] && !$attempt['count_incorrect']) {
                $countCorrect = 0;
                $countIncorrect = 0;
                foreach ($responses as $response) {
                    if ($response['is_correct'] == 1) {
                        $countCorrect++;
                    }
                    else {
                        $countIncorrect++;
                    }
                }
                $attempt['count_correct'] = $countCorrect;
                $attempt['count_incorrect'] = $countIncorrect;
                if ($attempt['assessment']['questions']) {
                    if (count($attempt['assessment']['questions'])) {
                        $attempt['calculated_score'] = $countCorrect / count($attempt['assessment']['questions']) * 100;
                    }
                }
            }
            //assessment, student, and course context information
            $attempt['assessment_name'] = $attempt['assessment']['name'];
            $studentData = Student::formatExport($attempt['student']);
            $attempt = array_merge($attempt, $studentData, $courseData);

            //remove columns that the instructor doesn't need and nested objects
            $removeKeys = [
                'assessment',
                'course_context_id',
                'student',
                'student_responses',
                'student_id'
            ];
            foreach ($removeKeys as $key) {
                unset($attempt[$key]);
            }
            array_push($formattedAttempts, $attempt);
        }
        return $formattedAttempts;
    }

    /**
    * Get an attempt's assessment ID
    *
    * @return int
    */

    public function getAssessmentId() {
        return $this->assessment_id;
    }

    /**
    * Get an attempt's assignment ID from Canvas
    *
    * @return int
    */

    public function getAssignmentId() {
        return $this->lti_custom_assignment_id;
    }

    /**
    * Get an attempt's line item ID (ID internal to Quick Check)
    *
    * @return int
    */

    public function getLineItemId() {
        return $this->line_item_id;
    }

    /**
    * Find the assignment ID for an assessment within a course context.
    *
    * @param  CourseContext  $courseContext
    * @param  int  $assessmentId
    * @return int
    */

    public static function getAssignmentIdFromAttempts($courseContext, $assessmentId)
    {
        $firstAttempt = Attempt::where('course_context_id', '=', $courseContext->id)
            ->where('assessment_id', '=', $assessmentId)
            ->firstOrFail();

        return $firstAttempt->getAssignmentId();
    }

    /**
    * Get an attempt's calculated score
    *
    * @return int
    */

    public function getCalculatedScore() {
        //don't think we'll run into this, but if the attempt has not been updated at all and
        //this value is still NULL, then return 0
        if (is_null($this->calculated_score)) {
            return 0;
        }

        return $this->calculated_score;
    }

    /**
    * Get the time zone of the course where an attempt was made
    *
    * @return string
    */

    public function getCourseTimeZone() {
        $courseContext = $this->courseContext()->first();
        return $courseContext->getTimeZone();
    }

    /**
    * Get an attempt's due_at timestamp
    *
    * @return timestamp
    */

    public function getDueAt($convertToDateTime = false) {
        $lineItem = $this->lineItem()->first();
        if (!$lineItem) {
            return null;
        }

        $dueAt = $lineItem->getDueAt();

        if ($convertToDateTime && $dueAt) { //don't convert a null value
            //convert due_at from datetime to timestamp
            return new DateTime($dueAt);
        }

        return $dueAt;
    }

    /**
    * Get an attempt's LTI launch nonce
    *
    * @return string $nonce
    */

    public function getNonce()
    {
        return $this->nonce;
    }

    /**
    * Get an attempt's LTI launch resource link ID
    *
    * @return string $resourceLinkId
    */

    public function getResourceLinkId()
    {
        return $this->resource_link_id;
    }

    /**
    * Get an attempt's score, based on number of correct responses out of total question count
    *
    * @return int
    */

    public function getScore() {
        $calculatedScore = 0;
        $countCorrect = $this->getCountCorrect();
        $partialCredit = $this->getPartialCredit();
        $points = $countCorrect + $partialCredit;
        $questionCount = $this->assessment->questions->count();
        if ($questionCount > 0) {
            $calculatedScore = $points / $questionCount;
        }
        return $calculatedScore;
    }

    /**
    * Get all attempts made on an assessment in a course context
    *
    * @param  int  $assessment_id
    * @param  int  $context_id
    * @param  int  $assignment_id
    * @param  bool $emptyAttemptsHidden
    * @return []   $attempts
    */

    public static function getAttemptsForAssessment($assessment_id, $context_id, $assignment_id, $emptyAttemptsHidden) {
        //get all attempts; sort by last name, but sort by user ID secondarily in case two users
        //have the same last name; for each user, sort attempts chronologically. this query is
        //a bit more involved, since we need to sort by student name, which is on a separate model.
        //note that ->select('attempts.*') was necessary to prevent attempt ID from being overwritten
        //on the join with the students table.
        $courseContext = CourseContext::where('lti_context_id', '=', $context_id)->first();
        $attempts = Attempt::where('course_context_id', '=', $courseContext->id)
            ->where('assessment_id', '=', $assessment_id)
            ->select('attempts.*')
            ->join('students', 'attempts.student_id', '=', 'students.id')
            ->orderBy('lis_person_name_family', 'ASC')
            ->orderBy('lti_custom_user_id', 'ASC')
            ->orderBy('attempts.created_at', 'ASC');

        if ($assignment_id) {
            //unfortunately we have to query both for historic 1.1 attempts and 1.3 using line items...
            $attempts = $attempts->whereHas('lineItem', function ($query) use ($assignment_id) {
                $query->where('lti_custom_assignment_id', $assignment_id);
            });
            $attempts = $attempts->orWhere('lti_custom_assignment_id', '=', $assignment_id);
        }

        if ($emptyAttemptsHidden) {
            $attempts = $attempts->has('studentResponses');
        }

        $attempts = $attempts->get();

        return $attempts;
    }

    /**
    * Get all attempts made by a student in a course context, grouped by assessment.
    *
    * @param  int  $student_id
    * @param  int  $context_id
    * @return []   $attempts
    */

    public static function getAssessmentsWithAttemptsForStudent($student_id, $context_id) {
        $assessmentAttempts = [];
        $courseContext = CourseContext::where('lti_context_id', '=', $context_id)->firstOrFail();
        $student = Student::find($student_id);

        //1) get attempts grouped by assessment
        $attemptsByAssessment = Attempt::where('course_context_id', '=', $courseContext->id)
            ->where('student_id', '=', $student_id)
            ->groupBy('assessment_id')
            ->orderBy('created_at')
            ->get();

        foreach($attemptsByAssessment as $assessmentAttempt) {
            //2) get each assessment
            $assessment_id = $assessmentAttempt->assessment_id;
            $assessment = Assessment::find($assessment_id);
            if (!$assessment) { //exclude soft-deletes
                continue;
            }

            //3) get attempts for each assessment
            $attempts = Attempt::where('course_context_id', '=', $courseContext->id)
                ->where('assessment_id', '=', $assessment_id)
                ->where('student_id', '=', $student_id)
                ->select('attempts.*')
                ->join('students', 'attempts.student_id', '=', 'students.id')
                ->orderBy('attempts.created_at', 'ASC')
                ->get();

            //4) add additional info for context onto each attempt
            foreach($attempts as $attempt) {
                $responses = StudentResponse::getResponsesForAttempt($attempt->id);
                $attempt->student_responses = $responses;
                $attempt->student = $student;
            }

            $assessment->attempts = $attempts;
            array_push($assessmentAttempts, $assessment);
        }

        return $assessmentAttempts;
    }

    /**
    * Get data needed to forward to Caliper sensor on LTI launch
    *
    * @return []
    */

    public function getCaliperData() {
        $caliperData = null;
        $caliper = new Caliper();
        $caliperEnabled = $caliper->isEnabled();
        if ($caliperEnabled) {
            $caliperData = $caliper->buildAssessmentStartedEventData($this);
        }

        return $caliperData;
    }

    /**
    * Get the duration of an attempt
    *
    * @return float (time in seconds)
    */

    public function getDuration() {
        return $this->updated_at->getTimestamp() - $this->created_at->getTimestamp();
    }

    /**
    * Return the url of the LTI consumer (always Canvas in our case)
    *
    * @return string
    */

    public function getLtiConsumerUrl()
    {
        return 'https://iu.instructure.com';
    }

    /**
    * Return the foreign key ID of the student this attempt belongs to
    *
    * @return int
    */

    public function getStudentId()
    {
        return $this->student_id;
    }

    /**
    * Initialize an attempt for a given assessment_id;
    * Writes a record in the database for the attempt, and can create either LTI or anonymous attempts
    *
    * @param  str        $assessment_id
    * @param  Request    $request
    * @param  LtiContext $ltiContext
    * @return void
    */

    public function initAttempt($assessmentId, Request $request, LtiContext $ltiContext = null) {
        $attemptType = $this->getAttemptType($request, $ltiContext);

        //only init with LTI data if present; otherwise, if user is restarting, data already copied from last valid attempt
        if ($attemptType === 'LTI' && $ltiContext) {
            $this->initLtiAttempt($assessmentId, $ltiContext);
        }
        if ($attemptType === 'Anonymous') {
            $this->initAnonymousAttempt($assessmentId);
        }
    }

    /**
    * Initialize an anonymous attempt
    *
    * @param  int  $assessmentId
    * @return Attempt
    */

    public function initAnonymousAttempt($assessmentId) {
        $this->assessment_id = $assessmentId;
        $this->last_milestone = $this->MILESTONE_CREATED;
        $this->save();
        return $this;
    }

    /**
    * Determine if the attempt is anonymous (outside of LTI context, such as a preview)
    *
    * @return boolean
    */

    public function isAnonymous()
    {
        //using course context id for determining, as a course context
        //can only be determined inside of an LTI launch
        if (!$this->course_context_id) {
            return true;
        }

        return false;
    }

    /**
    * Determine if the attempt is complete
    *
    * @return boolean
    */

    public function isComplete() {
        if ($this->complete == 1) {
            return true;
        }

        return false;
    }

    /**
    * Determine if an attempt has been launched
    *
    * @return boolean
    */

    public function isLaunched() {
        if ($this->last_milestone === $this->MILESTONE_CREATED) {
            return false;
        }

        return true;
    }

    /**
    * Determine if the attempt is past due
    *
    * @return boolean
    */

    public function isPastDue() {
        if (!$this->getDueAt()) { //no due date
            return false;
        }

        $convertToDateTime = true;
        $dueAt = $this->getDueAt($convertToDateTime)->getTimeStamp();
        $updatedAt = $this->updated_at->getTimeStamp();
        if ($updatedAt >= $dueAt) {
            return true;
        }

        return false;
    }

    /**
    * Determine if the attempt had been started
    *
    * @return boolean
    */

    public function isStarted() {
        //if the student had started the activity by answering questions
        $stage = $this->last_milestone;
        if ($stage !== 'LTI Launch' && $stage !== 'Anonymous Launch') {
            return true;
        }

        return false;
    }

    /**
    * Determine if the attempt is tied to the gradebook and can be graded
    *
    * @return boolean
    */

    public function isTiedToGradebook() {
        if ($this->line_item_id) {
            return true;
        }

        return false;
    }

    /**
    * Update attempt with launch status
    *
    * @param bool   $anonymous (optional, default false)
    * @return void
    */

    public function launchAttempt($anonymous = false) {
        if ($this->isLaunched()) {
            abort(403, 'Attempt has already been initialized, please refresh the page.');
        }

        if ($anonymous) {
            $this->last_milestone = $this->MILESTONE_ANONYMOUS_LAUNCH;
        }
        else {
            $this->last_milestone = $this->MILESTONE_LTI_LAUNCH;
        }

        $this->save();
    }

    /**
    * Reset attempt data for a new launch (used when restarting)
    *
    * @return void
    */

    public function reset() {
        $this->last_milestone = $this->MILESTONE_CREATED;
        $this->count_correct = null;
        $this->count_incorrect = null;
        $this->calculated_score = null;
        $this->complete = 0;
        $this->save();
    }

    /**
    * Update attempt
    *
    * @param  []  $attemptData
    * @return []  (include displayedScore)
    */

    public function updateAttempt($attemptData) {
        $caliperData = null;
        $this->saveOptionalParams($attemptData);
        //sometimes score is passed explicitly in custom activities; otherwise, calculate based on assessment
        if (!array_key_exists('calculated_score', $attemptData)) {
            $this->calculated_score = $this->getScore();
        }
        $this->save();

        $caliper = new Caliper();
        if ($this->isComplete() && $caliper->isEnabled()) {
            $caliperData = $caliper->buildAssessmentSubmittedEventData($this);
        }

        return [
            'caliper' => $caliperData,
            'displayedScore' => $this->calculated_score
        ];
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Get the attempt type (anonymous or LTI)
    *
    * @param  Request $request
    * @return string
    */

    private function getAttemptType($request, $ltiContext = null) {
        //if preview included, it's an anonymous attempt from instructor
        if ($request->has('preview')) {
            //boolean in js comes through as string
            $isPreview = $request->input('preview') === "true" ? true : false;
            if ($isPreview) {
                return 'Anonymous';
            }
        }

        //new LTI launch
        if ($ltiContext && !$request->has('anonymous')) {
            return 'LTI';
        }

        //student is restarting on the same quick check and data has been copied over
        if ($this->course_context_id) {
            return 'LTI';
        }

        //if not explicitly an instructor preview and no LTI context, throw an error
        throw new MissingLtiContextException;
    }

    /**
    * Get all attempts for the user that fall within the timeout feature's window;
    * used to determine if user should be given a timeout or not
    *
    * @return Collection
    */

    private function getAttemptsInTimeoutWindow() {
        #inspired by:
        #https://stackoverflow.com/questions/19475896/laravel-select-records-older-than-5-minutes
        $boundary = new DateTime();
        $boundary->modify('-' . $this->TIMEOUT_BOUNDARY);
        $boundary_timestamp = $boundary->format('Y-m-d H:i:s');

        $recentAttempts = Attempt::where('student_id', '=', $this->student_id)
            ->where('last_milestone', '!=', $this->TIMEOUT_MILESTONE) //only count valid attempts
            ->where('created_at', '>', $boundary_timestamp) //in a recent time period
            ->has('studentResponses') //where questions were answered (so not just a view)
            ->limit(20) //limit to ease load on DB, just in case someone is refreshing a lot
            ->get()
            ->filter(function($attempt, $key) {
                return !$attempt->isPastDue(); //if studying after due date, no timeout
            });

        return $recentAttempts;
    }

    /**
    * Get total count correct; this column is set directly with custom activities, otherwise,
    * the column is NULL and the value is based on number of related correct responses
    *
    * @return int
    */

    private function getCountCorrect() {
        if (!is_null($this->count_correct)) {
            return $this->count_correct;
        }
        return $this->studentResponses()->where('is_correct', '=', 1)->count();
    }

    /**
    * If a custom activity where group name is included, get the name of the student's group
    *
    * @return string
    */

    private function getGroupName() {
        $courseContext = CourseContext::find($this->course_context_id);
        $courseId = $courseContext->lti_custom_course_id;
        $student = Student::find($this->student_id);
        $studentId = $student->lti_custom_user_id;
        $canvasAPI = new CanvasAPI;
        $groupName = $canvasAPI->getUserGroup($courseId, $studentId);

        return $groupName;
    }

    /**
    * Get total partial credit on an attempt, across all questions
    *
    * @return int
    */

    private function getPartialCredit() {
        return $this->studentResponses->sum('partial_credit');
    }

    /**
    * Get time in seconds remaining in timeout
    *
    * @param  int   $studentId
    * @return mixed (int if value in cache and in future, otherwise false)
    */

    private function getTimeoutRemainingInCache($studentId) {
        $timeoutEnd = Cache::get($this->TIMEOUT_CACHE_KEY . $studentId);
        if (!$timeoutEnd) {
            return false;
        }

        $now = new DateTime();
        $timeRemaining = $timeoutEnd - $now->getTimestamp();
        if ($timeRemaining <= 0) {
            return false;
        }

        return $timeRemaining;
    }

    /**
    * Get time in seconds of timeout time remaining if feature enabled in collection
    *
    * @param  int  $assessmentId
    * @param  int  $studentId
    * @return int
    */

    public function getTimeoutRemaining($assessmentId, $studentId) {
        if (!$this->isTimeoutApplicable($assessmentId)) {
            return 0;
        }

        $timeoutRemainingInCache = $this->getTimeoutRemainingInCache($studentId);
        if ($timeoutRemainingInCache) {
            $this->setTimeoutOnAttempt();
            return $timeoutRemainingInCache;
        }

        $recentAttempts = $this->getAttemptsInTimeoutWindow();
        if ($recentAttempts->count() < $this->TIMEOUT_MAX_COUNT) {
            return 0;
        }

        //timeout length can be specified in env, but defaults to constant defined in class
        $timeoutLength = env('TIMEOUT_LENGTH', $this->TIMEOUT_LENGTH);
        $lastValidAttempt = $recentAttempts->last();
        $endTimeout = new DateTime($lastValidAttempt->updated_at);
        $endTimeout->modify('+' . $timeoutLength);
        $endTimeoutTimestamp = $endTimeout->getTimestamp();
        $this->setTimeoutInCache($studentId, $endTimeoutTimestamp);
        $this->setTimeoutOnAttempt();

        $now = new DateTime();
        $timeRemaining = $endTimeoutTimestamp - $now->getTimestamp(); //difference in seconds

        return $timeRemaining;
    }

    /**
    * Initialize an LTI attempt
    *
    * @param  int        $assessmentId
    * @param  LtiContext $ltiContext
    * @return Attempt
    */

    private function initLtiAttempt($assessmentId, $ltiContext) {
        $contextId = $ltiContext->getContextId();
        $courseContext = CourseContext::findByLtiContextId($contextId);
        $canvasUserId = $ltiContext->getUserId();
        $student = Student::findByCanvasUserId($canvasUserId);

        $this->assessment_id = $assessmentId;
        $this->course_context_id = $courseContext->id;
        $this->student_id = $student->id;
        $this->lti_custom_section_id = $ltiContext->getSectionId();
        $this->last_milestone = $this->MILESTONE_CREATED;
        $this->assignment_title = $ltiContext->getAssignmentTitle();
        $this->resource_link_id = $ltiContext->getResourceLinkId();
        $this->nonce = $ltiContext->getNonce();

        //if an instructor, designer, etc. from LTI context, then leave line item value NULL,
        //as it will error out if we try to start a submission for a non-student.
        $lineItemUrl = $ltiContext->getLineItemUrl();
        if (!$ltiContext->isInstructor() && $lineItemUrl) {
            $lineItem = LineItem::findByUrl($lineItemUrl);
            $assignmentId = $ltiContext->getAssignmentId();
            $dueAt = $ltiContext->getDueAt();
            $pointsPossible = $ltiContext->getPointsPossible();

            if (!$lineItem) {
                $lineItem = new LineItem();
                $lineItem->initialize($lineItemUrl, $dueAt, $assignmentId);
            }

            if ($lineItem->getDueAt() != $dueAt) { //update if instructor changed due date
                $lineItem->setDueAt($dueAt);
            }

            if ($lineItem->getScoreMaximum() != $pointsPossible) { //update if instructor changed score
                $lineItem->setScoreMaximum($pointsPossible);
            }

            $this->line_item_id = $lineItem->id;
        }

        $this->save();

        return $this;
    }

    /**
    * Determine if timeout feature applies to an attempt (before due date, not anonymous, etc.)
    *
    * @param  int  $assessmentId
    * @return boolean
    */

    private function isTimeoutApplicable($assessmentId) {
        //must be enabled at the collection-level
        $collectionFeature = new CollectionFeature();
        if (!$collectionFeature->isAttemptTimeoutEnabled($assessmentId)) {
            return false;
        }

        //only needed for LTI attempts
        if ($this->isAnonymous()) {
            return false;
        }

        //if studying after the due date, no timeout necessary
        if ($this->isPastDue()) {
            return false;
        }

        return true;
    }

    /**
    * Save optional parameters when updating an attempt, if present
    * (i.e., new milestone is not always reached each time a question is submitted, etc.)
    *
    * @param  []  $attemptData
    * @return void
    */

    private function saveOptionalParams($attemptData) {
        foreach($this->optionalParams as $optionalParam) {
            if (array_key_exists($optionalParam, $attemptData)) {
                $this->setAttribute($optionalParam, $attemptData[$optionalParam]);
            }
        }
    }

    /**
    * Set timeout in cache for this user; can't simply use a DB query because the timeout length may be longer
    * than the window in which attempts can be made, i.e., if student is on a 2 minute timeout, but we are checking
    * for attempts made within a 1 minute window, then query for the 1 minute window would give us the thumbs up.
    * Have the item persist in the cache only for the duration of the timeout.
    *
    * @param  int   $studentId
    * @param  int   $endTimeoutTimestamp
    * @return void
    */

    private function setTimeoutInCache($studentId, $endTimeoutTimestamp) {
        Cache::put($this->TIMEOUT_CACHE_KEY . $studentId, $endTimeoutTimestamp, $endTimeoutTimestamp);
    }

    /**
    * Set an attempt as being subject to a timeout in the database
    *
    * @return void
    */

    private function setTimeoutOnAttempt() {
        $this->last_milestone = $this->TIMEOUT_MILESTONE;
        $this->save();
    }
}