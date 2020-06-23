<?php

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use App\Models\CourseContext;
use App\Models\Release;
use App\Models\Assessment;

class ReleaseController extends \BaseController
{
    /************************************************************************/
    /* VIEW ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * The student view when accessing the manage portion from the left nav
    *
    * @return View
    */

    public function contextReleaseIndex()
    {
        return displaySPA();
    }

    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * Create a release of an assessment, specific to a course
    *
    * @return Response (includes: release)
    */

    public function createRelease(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assessmentId' => 'required',
            'ltiContextId' => 'required'
        ]);
        if ($validator->fails()) {
            return response()->error(400);
        }

        $assessmentId = $request->input('assessmentId');
        $ltiContextId = $request->input('ltiContextId');
        $assessment = Assessment::findOrFail($assessmentId);
        if (!$assessment->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $courseContext = CourseContext::where('lti_context_id', '=', $ltiContextId)->first();
        $release = new Release();
        if ($release->exists($assessmentId, $courseContext->id)) {
            return response()->error(500, ['A release for this assessment in this LTI context already exists']);
        }
        $release->assessment_id = $assessmentId;
        $release->course_context_id = $courseContext->id;
        $release->save();

        return response()->success(['release' => $release->toArray()]);
    }

    /**
    * Get all released assessments within a context (can be used by student to see results)
    *
    * @param  string  $lti_context_id
    * @return Response (includes: releases)
    */

    public function getReleasedAssessments($lti_context_id, Request $request)
    {
        $release = new Release;
        //get releases with associated assessments
        $releases = $release->getReleasesForContext($lti_context_id);
        return response()->success(['releases' => $releases->toArray()]);
    }

    /**
    * Rollback a release so it is no longer visible to students
    *
    * @param  int  $releaseId
    * @return Response
    */

    public function rollbackRelease($releaseId, Request $request)
    {
        $release = Release::findOrFail($releaseId);
        $assessment = Assessment::findOrFail($release->assessment_id);
        if (!$assessment->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $release->delete();
        return response()->success();
    }
}
