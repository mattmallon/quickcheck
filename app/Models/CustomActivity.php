<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model as Eloquent;
use App\Classes\LTI\LtiContext as LtiContext;
use App\Classes\ExternalData\CanvasAPI as CanvasAPI;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class CustomActivity extends Eloquent {
    protected $table = 'custom_activities';
    protected $fillable = [
        'name',
        'url',
        'description',
        'developer',
        'group_required'
    ];

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Get the absolute URL when redirecting to a custom activity to take an assessment
    *
    * @param  Request  $request
    * @param  int      $assessmentId
    * @return string
    */

    public function getRedirectUrl(Request $request, $assessmentId) {
        //in the redirect url, include the assessment id as a query param, so an attempt can be initialized
        $redirectUrl = URL::asset('customActivities') . '/' . $this->url . '?id=' . $assessmentId;

        //if previewing as an instructor
        if ($request->has('preview')) {
            $redirectUrl .= '&preview=' . $request->input('preview');
        }

        if ($this->isGroupRequired()) { //if group name required, pass as additional query param
            $groupName = $this->getGroupName($request);
            //if the user is not in a group, or we are viewing anonymously, there may not be a group supplied
            if ($groupName) {
                $redirectUrl .= '&group=' . urlencode($groupName);
            }
        }

        return $redirectUrl;
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * When group name required for a custom activity, retrieve student's group name
    * via the Canvas API within a course
    *
    * @param  Request  $request
    * @return string
    */

    private function getGroupName(Request $request) {
        $courseId = $request->custom_canvas_course_id;
        $userId = $request->custom_canvas_user_id;
        if (!$courseId || !$userId) {
            return false;
        }
        $canvasAPI = new CanvasAPI;
        $groupName = $canvasAPI->getUserGroup($courseId, $userId);
        return $groupName;
    }

    /**
    * Determine if a group is required for a custom activity
    *
    * @return boolean
    */

    private function isGroupRequired() {
        if ($this->group_required === 'true') {
            return true;
        }
        else {
            return false;
        }
    }
}
