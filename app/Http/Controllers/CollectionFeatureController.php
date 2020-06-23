<?php
use Illuminate\Http\Request;
use App\Models\Collection;
use App\Models\CollectionFeature;
use App\Models\User;

class CollectionFeatureController extends \BaseController
{

    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * Get features for a collection
    *
    * @param  int  $collectionId
    * @return Response
    */

    public function getFeatures(Request $request, $collectionId)
    {
        $collection = Collection::find($collectionId);
        $collectionFeatures = null;
        $user = $request->user;

        if ($user->isAdmin()) {
            $collectionFeatures = $collection->collectionFeatures()
                ->with('feature')
                ->get();
        }
        else {
            $collectionFeatures = $collection->collectionFeatures()
                ->with('feature')
                ->get()
                ->filter(function ($collectionFeature, $key) {
                    return $collectionFeature->feature->admin_only === 'false';
                });
        }

        return response()->success(['features' => $collectionFeatures]);
    }

    /**
    * Update a collection feature to be toggled on or off
    *
    * @param  int  $id
    * @return Response
    */

    public function update(Request $request, $id)
    {
        $featureToUpdate = $request->input('collectionFeature');
        $collectionId = $featureToUpdate['collection_id'];
        $collection = Collection::findOrFail($collectionId);
        if (!$collection->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $user = $request->user;
        $collectionFeature = CollectionFeature::with('feature')->findOrFail($id);
        if ($collectionFeature->feature->admin_only === 'true' && !$user->isAdmin()) {
            return response()->error(403);
        }

        $collectionFeature->enabled = $featureToUpdate['enabled'];
        $collectionFeature->save();
        return response()->success();
    }
}
