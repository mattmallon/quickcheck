<?php

use Illuminate\Http\Request;
use App\Models\Collection;
use App\Models\AssessmentGroup;

class AssessmentGroupController extends \BaseController
{

    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * Delete the assessment group
    *
    * @param  int  $id
    * @return Response
    */

    public function destroy($id)
    {
        $assessmentGroup = AssessmentGroup::with('assessments')->findOrFail($id);
        if (!$assessmentGroup->canUserWrite($request->user)) {
            return response()->error(403);
        }

        //cascade soft delete on assessments
        foreach($assessmentGroup->assessments as $assessment) {
            $assessment->delete();
        }

        $assessmentGroup->delete();
        return response()->success();
    }

    /**
    * Store a newly created assessment group
    *
    * @param  Request  $request
    * @return  Response
    */

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required',
            'collection_id' => 'required'
        ]);
        if ($validator->fails()) {
            return response()->error(400, ['Name and collection ID are required.']);
        }

        //check to see if user has membership/permissions for this collection
        $collectionId = $request->collection_id;
        $collection = Collection::findOrFail($collectionId);
        if (!$collection->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $assessmentGroup = AssessmentGroup::create([
            'name' => $request->name,
            'collection_id' => $collectionId
        ]);
        return response()->success(['assessmentGroup' => $assessmentGroup->toArray()]);
    }

    /**
    * Update the assessment group.
    *
    * @param  int  $id
    * @return Response
    */

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required'
        ]);
        if ($validator->fails()) {
            return response()->error(400, ['Name field is required.']);
        }

        $assessmentGroup = AssessmentGroup::findOrFail($id);
        if (!$assessmentGroup->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $assessmentGroup->name = $request->name;
        $assessmentGroup->save();
        return response()->success(['assessmentGroup' => $assessmentGroup->toArray()]);
    }
}
