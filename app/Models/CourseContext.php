<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model as Eloquent;
use Illuminate\Http\Request;
use App\Classes\ExternalData\CanvasAPI;
use Validator;

class CourseContext extends Eloquent {
    protected $table = "course_contexts";
    protected $fillable = [
        "lti_context_id",
        "lti_custom_course_id",
        "time_zone",
        "lis_course_offering_sourcedid"
    ];

    public function attempts() {
        return $this->hasMany('App\Models\Attempt');
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Find a course context from database by the LTI context ID
    *
    * @param  string $contexdtId
    * @return CourseContext
    */

    public static function findByLtiContextId($contextId)
    {
        $courseContext = CourseContext::where('lti_context_id', '=', $contextId)->first();
        if (!$courseContext) {
            abort(500, 'Existing course context could not be found.');
        }

        return $courseContext;
    }

    /**
    * Format course context information into an array for CSV export
    *
    * @param  []  $courseData
    * @return []
    */

    public static function formatExport($courseData)
    {
        $export = $courseData;
        $keysToRemove = ['id', 'updated_at', 'created_at'];
        foreach($keysToRemove as $key) {
            unset($export[$key]);
        }
        return $export;
    }

    /**
    * Get the Canvas course ID of the course context
    *
    * @return string
    */

    public function getCourseId()
    {
        return $this->lti_custom_course_id;
    }

    /**
    * Get the sourced ID of the course
    *
    * @return string
    */

    public function getCourseOfferingSourcedid()
    {
        return $this->lis_course_offering_sourcedid;
    }

    /**
    * Get the time zone of the course context
    *
    * @return string
    */

    public function getTimeZone()
    {
        return $this->time_zone;
    }

    /**
    * Initialize a new course context
    *
    * @param  string $contextId
    * @param  string $courseId
    * @param  string $sourcedId
    * @return void
    */

    public function initialize($contextId, $courseId, $sourcedId)
    {
        $this->lti_context_id = $contextId;
        $this->lti_custom_course_id = $courseId;
        $this->lis_course_offering_sourcedid = $sourcedId;
        $this->time_zone = $this->getCourseTimeZoneFromAPI($courseId);
        $this->save();
    }

    /**
    * Update an existing course to add a sourced ID, which was not formerly saved on this model
    *
    * @param  string $sourcedId
    * @return void
    */

    public function setCourseOfferingSourcedid($sourcedId)
    {
        $this->lis_course_offering_sourcedid = $sourcedId;
        $this->save();
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * When initializing a new course context, query Canvas API to retrieve course time zone
    *
    * @param  int  $courseId
    * @return string
    */

    private function getCourseTimeZoneFromAPI($courseId)
    {
        $canvasAPI = new CanvasAPI();
        $canvasCourse = $canvasAPI->getCourse($courseId);
        if (!$canvasCourse) {
            $error = 'Unable to initialize course context, course was not found in the Canvas API.';
            abort(500, $error);
        }
        return $canvasCourse['time_zone'];
    }
}
