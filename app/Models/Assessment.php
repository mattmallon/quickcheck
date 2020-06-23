<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model as Eloquent;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Classes\Questions\AbstractQuestionOption as QuestionOption;
use App\Classes\Permissions\MembershipPermissionsInterface;

class Assessment extends Eloquent implements MembershipPermissionsInterface
{
    use SoftDeletes;
    protected $table = 'assessments';
    protected $fillable = [
        'assessment_group_id',
        'name',
        'title',
        'description',
        'custom_activity_id',
        'shuffled'
    ];

    public function assessmentGroup() {
        return $this->belongsTo('App\Models\AssessmentGroup');
    }

    public function customActivity() {
        return $this->belongsTo('App\Models\CustomActivity');
    }

    public function questions() {
        return $this->hasMany('App\Models\Question');
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/


    /**
    * Determine if currently logged in user has access to read assessment
    *
    * @param  User $user
    * @return boolean
    */

    public function canUserRead($user) {
        $collection = $this->assessmentGroup->collection;
        $membership = new Membership();
        if ($membership->canReadFromCollection($collection, $user)) {
            return true;
        }

        return false;
    }


    /**
    * Determine if currently logged in user has access to edit assessment
    *
    * @param  User $user
    * @return boolean
    */

    public function canUserWrite($user) {
        $collection = $this->assessmentGroup->collection;
        $membership = new Membership();
        if ($membership->canWriteToCollection($collection, $user)) {
            return true;
        }

        return false;
    }

    /**
    * Copy an assessment
    *
    * @param  int     $id
    * @param  int     $assessmentGroupId
    * @param  string  $name
    * @return Assessment
    */

    public function copy($id, $assessmentGroupId, $name) {
        //copy the basic assessment information
        $assessment = Assessment::find($id);
        $copiedAssessment = $assessment->replicate();
        $copiedAssessment->assessment_group_id = $assessmentGroupId;
        $copiedAssessment->name = $name;
        $copiedAssessment->save();

        //replicate questions (if any)
        foreach ($assessment->questions as $question) {
            $question->copy($copiedAssessment->id);
        }

        return $copiedAssessment;
    }

    /**
    * Create an assessment, including questions -- currently only used when importing QTI
    *
    * @param  []  $input
    * @return []  $assessment
    */

    public function createAssessment($input) {
        //at minimum, we need a name and an assessment group id
        if (!array_key_exists('name', $input) || !array_key_exists('assessment_group_id', $input)) {
            return false;
        }

        $assessment = $this->create([
            'name' => $input['name'],
            'assessment_group_id' => $input['assessment_group_id'],
            'title' => array_key_exists('title', $input) ? $input['title'] : '',
            'description' => array_key_exists('description', $input) ? $input['description'] : '',
            'custom_activity_id' => array_key_exists('custom_activity_id', $input) ? $input['custom_activity_id'] : null
        ]);
        $assessmentId = $assessment->id;

        if (array_key_exists('questions', $input)) {
            foreach ($input['questions'] as $question) {
                $addedQuestion = Question::create(['assessment_id' => $assessment->id]);
                $addedQuestion->updateQuestion($question);
                $questionType = $addedQuestion['question_type'];
                $questionOption = QuestionOption::getAnswerModelFromQuestionType($questionType);
                $questionOption->saveQuestionOptions($addedQuestion, $question);
            }
        }

        return $assessment->toArray();
    }


    /**
    * Determine if assessment is a custom activity
    *
    * @return boolean
    */

    public function isCustomAssessment() {
        if ($this->custom_activity_id) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
    * Search assessment data, questions, feedback, etc. for text
    *
    * @param  string  $searchTerm
    * @return mixed (Assessment with pertinent questions if results found, FALSE if not)
    */

    public function search($searchTerm) {
        $resultsFound = false;
        $questionResults = [];

        //search attributes specific to the assessment
        $attrsToSearch = [$this->name, $this->title, $this->description];
        foreach($attrsToSearch as $attr) {
            if (strpos(strtolower($attr), $searchTerm) !== false) {
                $resultsFound = true;
            }
        }

        //search related questions
        foreach ($this->questions as $question) {
            $results = $question->search($searchTerm);
            if ($results) {
                $resultsFound = true;
                array_push($questionResults, $results);
            }
        }

        //attach pertinent questions that matched search results, if found
        $this->questionSearchResults = $questionResults;

        if (!$resultsFound) {
            return false;
        }

        return $this;
    }

    /**
    * Update assessment, questions not included
    *
    * @param  []  $updatedAssessment
    * @return void
    */

    public function updateAssessment($updatedAssessment) {
        //custom activity id might not be included in the data, so check for it so an error isn't thrown
        $customActivityId = null;
        if (array_key_exists('custom_activity_id', $updatedAssessment)) {
            //if the activity ID is an empty string (null in js), set it to null in PHP so foreign key constraint behaves
            $activityId = $updatedAssessment['custom_activity_id'];
            $customActivityId = empty($activityId) ? null : $activityId;
        }
        $this->update([
            'name' => $updatedAssessment['name'],
            'title' => $updatedAssessment['title'],
            'description' => $updatedAssessment['description'],
            'assessment_group_id' => $updatedAssessment['assessment_group_id'],
            'shuffled' => $updatedAssessment['shuffled'],
            'custom_activity_id' => $customActivityId
        ]);
    }
}
