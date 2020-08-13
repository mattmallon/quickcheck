<?php

namespace App\Classes\LTI;
use App\Models\CollectionFeature;
use Log;
use DateTime;
use DateTimeZone;

class Grade {

    private $attempt;

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    public function __construct($attempt)
    {
        $this->attempt = $attempt;
    }

    /**
    * Based on the collection that an assessment belongs to, is automatic grade passback enabled?
    * Checking the feature that has been set on the collection based on the assessment id in attempt.
    *
    * @return boolean
    */

    public function isGradePassbackEnabled()
    {
        $assessmentId = $this->attempt->getAssessmentId();
        $collectionFeature = new CollectionFeature;
        return $collectionFeature->isGradePassbackEnabled($assessmentId);
    }

    /**
    * Is the attempt ready to be graded? Is it finished, an assignment, and not past due?
    *
    * @return boolean
    */

    public function isReadyForGrade()
    {
        if (!$this->attempt->isComplete()) {
            return false;
        }

        if (!$this->attempt->isTiedToGradebook()) {
            return false;
        }

        if ($this->isPastDue()) {
            return false;
        }

        return true;
    }

    /**
    * Submit a grade to the gradebook
    *
    * @return  boolean (on success/error)
    */

    public function submitGrade()
    {
        $gradePassbackResult = $this->doGradePassback();
        return $gradePassbackResult;
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * The guts of grade passback; relies on Outcome model. Score is 0-1.
    * Checks that the new score is higher than the existing score in the gradebook.
    *
    * @return boolean (on success/error)
    */

    private function doGradePassback()
    {
        $lineItem = $this->attempt->lineItem;
        $lineItemUrl = $lineItem->getUrl();
        $scoreMaximum = $lineItem->getScoreMaximum();
        $ltiContext = new LtiContext();
        $student = $this->attempt->student;
        $userId = $student->getCanvasUserId();
        $result = $ltiContext->getResult($lineItemUrl, $userId);
        //dd($result);
        if (!$result) { //if no submission yet and NULL, then convert to numeric value of 0
            $result = 0;
        }
        $scoreGiven = $this->attempt->getCalculatedScore();
        $gradeToSubmit = $this->formatGradeToSubmit($scoreGiven, $scoreMaximum);
        //dd($gradeToSubmit);
        if ($gradeToSubmit <= $result) {
            return true;
        }

        $submissionResult = $ltiContext->submitGrade($lineItemUrl, $userId, $gradeToSubmit, $scoreMaximum);
        return $submissionResult;
    }

    /**
    * Format grade to make sure it is a float and is not > 1 on the 0-1 scale
    *
    * @return float $gradeToSubmit
    */

    private function formatGradeToSubmit($score, $scoreMaximum)
    {
        //all grades are on a scale from 0-1, because this is the format required for LTI Outcome grade
        //passback. in some cases, such as an instructor grading, it may be formatted as 0-100. however,
        //the front-end should translate this to be 0-1 before passing to the back-end. consistently
        //across the back-end, score should ONLY be in the 0-1 range. anything else is presentation only.
        $gradeToSubmit = floatval($score);
        //ensure that the grade is not greater than 100% (can happen in construct 2 from double clicking)
        if ($gradeToSubmit > 1) {
            $gradeToSubmit = 1;
        }

        //format result based off of score maximum of the line item; even if we used a scale of 0 - 1 similar to
        //LTI 1.1, we discovered that if an instructor makes a change to the grade in Canvas, then the result
        //returned by Canvas will be proportional to the total number of points of the assignment, which could result
        //in values such as a score of 4/1 rather than 1/1.
        $gradeToSubmit = $gradeToSubmit * $scoreMaximum;
        return $gradeToSubmit;
    }

    /**
    * Check to see if the most recent score is higher than existing grade in gradebook
    *
    * @return boolean
    */

    private function isHighestScore($gradeToSubmit, $sourcedID, $outcome)
    {
        $existinggrade = floatval($outcome->readGrade($sourcedID, $this->attempt, $this->request));
        //E. Scull: A grade of "0" needs to be entered in the gradebook if they earn that score on the first try.
        // A non-existent grade is converted to 0 by floatval().
        // If the existing grade is 0 (i.e., doesn't exist), and the current grade is 0, we still need to submit.
        if (($gradeToSubmit > $existinggrade) || ($existinggrade == 0 && $gradeToSubmit == 0)) {
            return true;
        }

        return false;
    }

    /**
    * Determine if the current attempt is past due or not; no grade passback if past the due date
    * Note: comparison is based on the timezone of the course context in which the attempt was made
    *
    * @return boolean
    */

    private function isPastDue()
    {
        $dueAt = false; //default, in case no due date is set
        $courseTimeZone = $this->attempt->getCourseTimeZone();
        $courseDateTimeZone = new DateTimeZone($courseTimeZone);
        $utcTimeZone = new DateTimeZone('UTC');

        //Canvas gives us date in UTC, stored that way in DB, but we convert to course timezone
        $dueAtValue = $this->attempt->getDueAt();
        if ($dueAtValue) {
            $dueAt = new DateTime($dueAtValue, $utcTimeZone);
            $dueAt = $dueAt->setTimezone($courseDateTimeZone);
        }

        //get current time, converted to course-specific timezone (rather than server default)
        $now = new DateTime("now", $courseDateTimeZone);

        // If $dueAt is FALSE, allow grade to be passed back (no due date supplied)
        if (!$dueAt || $now <= $dueAt) {
            return false;
        }

        return true;
    }
}
