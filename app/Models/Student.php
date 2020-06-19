<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model as Eloquent;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Validator;

class Student extends Eloquent {
    protected $table = "students";
    protected $fillable = [
        "lis_person_name_given",
        "lis_person_name_family",
        "lti_custom_canvas_user_login_id",
        "lti_custom_user_id",
        "lti_person_sourcedid",
        "api_token"
    ];

    public function attempts() {
        return $this->hasMany('App\Models\Attempt');
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Format student data for a CSV export to be included in a row
    *
    * @param  []  $studentData
    * @return []
    */

    public static function formatExport($studentData)
    {
        $export = $studentData;
        $keysToRemove = ['id', 'updated_at', 'created_at'];
        foreach($keysToRemove as $key) {
            unset($export[$key]);
        }
        return $export;
    }

    /**
    * Retrieve student from database by Canvas user ID
    *
    * @param  int $canvasUserId
    * @return Student
    */

    public static function findByCanvasUserId($canvasUserId)
    {
        $student = Student::where('lti_custom_user_id', '=', $canvasUserId)->first();
        if (!$student) {
            abort(500, 'Existing student not found.');
        }

        return $student;
    }

    /**
    * Retrieve student from database by API token
    *
    * @param  string $apiToken
    * @return Student
    */

    public static function findByApiToken($apiToken)
    {
        $student = Student::where('api_token', $apiToken)->firstOrFail();
        return $student;
    }

    /**
    * Return the Quick Check-specific API token of the student
    *
    * @return str
    */

    public function getApiToken()
    {
        return $this->api_token;
    }

    /**
    * Return the canvas user ID of the student (numeric)
    *
    * @return int
    */

    public function getCanvasUserId()
    {
        return $this->lti_custom_user_id;
    }

    /**
    * Return the canvas user login ID of the student (string)
    *
    * @return string
    */

    public function getCanvasUserLoginId()
    {
        return $this->lti_custom_canvas_user_login_id;
    }

    /**
    * Return the sourced ID of the student (string)
    *
    * @return string
    */

    public function getLisPersonSourcedId()
    {
        return $this->lis_person_sourcedid;
    }

    /**
    * Initialize a new student
    *
    * @param  string $givenName
    * @param  string $familyName
    * @param  string $canvasUserId
    * @param  string $canvasLoginId
    * @param  string $personSourcedId
    * @return void
    */

    public function initialize($givenName, $familyName, $canvasUserId, $canvasLoginId, $personSourcedId)
    {
        $this->lis_person_name_given = $givenName;
        $this->lis_person_name_family = $familyName ? $familyName : ''; //service accounts may not have last name, default blank string
        $this->lti_custom_canvas_user_login_id = $canvasLoginId;
        $this->lti_custom_user_id = $canvasUserId;
        $this->lis_person_sourcedid = $personSourcedId;
        $this->api_token = Str::random(60);
        $this->save();
    }

    /**
    * Update an existing user to add an API token, which was not formerly saved on this model
    *
    * @return void
    */

    public function setApiToken()
    {
        $this->api_token = Str::random(60);
        $this->save();
    }

    /**
    * Update an existing user to add a sourced ID, which was not formerly saved on this model
    *
    * @param  string $sourcedId
    * @return void
    */

    public function setLisPersonSourcedId($sourcedId)
    {
        $this->lis_person_sourcedid = $sourcedId;
        $this->save();
    }
}
