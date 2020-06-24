<?php
use Illuminate\Http\Request;
use App\Classes\Auth\AuthFilter;
use App\Classes\LTI\LtiContext;
use App\Models\Collection;
use App\Models\User;
use App\Models\AssessmentGroup;
use App\Models\Assessment;
use App\Models\Question;

class CollectionController extends \BaseController
{

    /************************************************************************/
    /* VIEW ENDPOINTS *******************************************************/
    /************************************************************************/

    /**
    * Display all collections.
    *
    * @return View
    */

    public function indexView(Request $request)
    {
        return displaySPA();
    }


    /**
    * In Canvas, select an external tool link for LTI
    *
    * @return redirect
    */

    public function selectLink(Request $request)
    {
        $authFilter = new AuthFilter($request);

        if (!$authFilter->isLtiLaunch()) {
            abort(403, 'A valid LTI context is required to access this resource.');
        }

        //if we have a valid LTI launch, cache the nonce, role, and user ID, and redirect for auth
        //to obtain an API token. Then remove that item from the cache so it can only be used once per launch.
        $redirectUrl = $authFilter->buildRedirectUrl('select'); //TODO: slash here for abs path? had that before

        $ltiContext = new LtiContext;
        $ltiContext->setLaunchValues($request->ltiLaunchValues);
        $canvasRedirectUrl = urlencode($ltiContext->getDeepLinkingRedirectUrl());

        if (!$canvasRedirectUrl) {
            abort(400, 'A valid redirect URL from Canvas must be provided.');
        }

        //redirect with input vars added as query params to make them available to the front-end
        $launchUrlStem = urlencode(env('APP_URL') . '/index.php/assessment?id=');
        $redirectUrl .= '&redirectUrl=' . $canvasRedirectUrl;
        $redirectUrl .= '&launchUrlStem=' . $launchUrlStem;
        return redirect($redirectUrl);
    }

    /**
    * Display a single collection.
    *
    * @param  int  $id
    * @return View
    */

    public function show($id)
    {
        return displaySPA();
    }

    /**
    * GET request to show the select screen after a valid LTI launch and redirect.
    *
    * @param  int  $id
    * @return View
    */

    public function viewSelectLink(Request $request)
    {
        $redirectUrl = $request->get('redirectUrl');
        $launchUrlStem = $request->get('launchUrlStem');

        if (!$redirectUrl || !$launchUrlStem) {
            abort(400, 'Redirect url and launch url are required.');
        }

        $authFilter = new AuthFilter($request);
        if (!$authFilter->isValidRedirect()) {
            abort(403, 'Unauthorized: please launch the tool from an external tool launch in Canvas.');
        }

        return displaySPA();
    }

    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * Delete the collection
    *
    * @param  int  $id
    * @return Response
    */

    public function destroy($id)
    {
        $collection = Collection::findOrFail($id);
        if (!$collection->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $collection->delete();
        return response()->success();
    }

    /**
    * Get a single collection and its associated data
    *
    * @param  int  $id
    * @return response (includes: collection, assessmentGroups, readOnly, collectionFeatures)
    */

    public function getCollection($id)
    {
        $collection = Collection::findOrFail($id);
        if (!$collection->canUserRead($request->user)) {
            return response()->error(403);
        }

        $readOnly = false;
        if (!$collection->canUserWrite($request->user)) {
            $readOnly = true;
        }

        $assessmentGroups = $collection->assessmentGroups()->with('assessments')->get();

        return response()->success([
            'collection' => $collection->toArray(),
            'assessmentGroups' => $assessmentGroups->toArray(),
            'readOnly' => $readOnly
        ]);
    }

    /**
    * Get user and their permissions for this collection
    *
    * @param  int  $id
    * @return Response (includes current user and readOnly boolean)
    */

    public function getUserPermissions($id)
    {
        $user = $request->user;
        $collection = Collection::findOrFail($id);
        if (!$collection->canUserRead($user)) {
            return response()->error(403);
        }

        $readOnly = false;
        if (!$collection->canUserWrite($user)) {
            $readOnly = true;
        }

        return response()->success([
                'user' => $user->toArray(),
                'readOnly' => $readOnly
        ]);
    }

    /**
    * Get all collections (admin-only, normal users can only see their memberships)
    *
    * @param  bool  $assessments
    * @return response (includes: collections)
    */

    public function index(Request $request, $assessments = false)
    {
        $collections = [];
        $user = $request->user;
        if (!$user->isAdmin()) {
            return response()->error(403);
        }

        if ($assessments) {
            $collections = Collection::with('assessmentGroups', 'assessmentGroups.assessments')->get();
        }
        else {
            $collections = Collection::all();
        }

        return response()->success(['collections' => $collections->toArray()]);
    }

    /**
    * Get all public collections that are available
    *
    * @return response (includes: public collections, user membership)
    */

    public function publicIndex(Request $request)
    {
        $publicCollections = Collection::where('public_collection', '=', 'true')
            ->with(['userMembership' => function ($query, $request) {
                $query->currentUser($request);
            }])
            ->get();
        return response()->success(['publicCollections' => $publicCollections]);
    }

    /**
    * Update collection to toggle it public or private -- admin-only!
    *
    * @param  int  $collectionId
    * @return Response (includes newly updated collection)
    */

    public function publicToggle(Request $request, $collectionId)
    {
        $user = $request->user;
        if (!$user->isAdmin()) {
            return response()->error(403);
        }

        $collection = Collection::findOrFail($collectionId);
        $collection->public_collection = $request->input('public_collection');
        $collection->save();
        return response()->success([ 'collection' => $collection->toArray()]);
    }

    /**
    * Save assessment to a particular assessment group and collection (used when adding on the home page)
    *
    * @return response (includes: assessmentId)
    */

    public function quickAdd(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assessment.collection.id' => 'required',
            'assessment.assessmentGroup.id' => 'required',
            'assessment.name' => 'required',
            'assessment.collection.name' => 'sometimes|required',
            'assessment.assessmentGroup.name' => 'sometimes|required'
        ]);

        if ($validator->fails()) {
            return response()->error(400);
        }

        $assessment = $request->input('assessment');
        $assessmentGroup = null;
        $collectionId = $assessment['collection']['id'];
        $assessmentGroupId = $assessment['assessmentGroup']['id'];
        $newCollection = strpos($collectionId, 'new') !== false ? true : false;
        $newAssessmentGroup = strpos($assessmentGroupId, 'new') !== false ? true : false;

        if ($newCollection) {
            $collection = new Collection();
            $collection->storeCollection($assessment['collection']['name'], $request->user);
        }
        else {
            $collection = Collection::findOrFail($collectionId);
            if (!$collection->canUserWrite($request->user)) {
                return response()->error(403);
            }
        }

        if ($newAssessmentGroup) {
            $assessmentGroup = AssessmentGroup::create([
                'collection_id' => $collection->id,
                'name' => $assessment['assessmentGroup']['name']
            ]);
        }
        else {
            $assessmentGroup = AssessmentGroup::findOrFail($assessmentGroupId);
        }

        $assessment = Assessment::create([
            'assessment_group_id' => $assessmentGroup->id,
            'name' => $assessment['name']
        ]);
        return response()->success(['assessmentId' => $assessment->id]);
    }

    /**
    * Search inside a collection for a search term (passed via POST param)
    *
    * @param  int  $id
    * @return response (includes [] of search results)
    */

    public function search(Request $request, $id)
    {
        $searchResults = [];
        $searchTerm = strtolower($request->input('searchTerm'));

        $collection = Collection::with([
            'assessmentGroups',
            'assessmentGroups.assessments'
        ])
        ->findOrFail($id);

        if (!$collection->canUserRead($request->user)) {
            return response()->error(403);
        }

        foreach($collection->assessmentGroups as $assessmentGroup) {
            foreach($assessmentGroup->assessments as $assessment) {
                $results = $assessment->search($searchTerm);
                if ($results) {
                    array_push($searchResults, $results);
                }
            }
        }

        if (!count($searchResults)) {
            $searchResults = null;
        }

        return response()->success(['searchResults' => $searchResults]);
    }

    /**
    * Store a new collection
    *
    * @return Response (includes newly created collection)
    */

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required'
        ]);
        if ($validator->fails()) {
            return response()->error(400, ['The name field is required.']);
        }

        $collection = new Collection();
        $collection->storeCollection($request->input('name'), $request->user, $request->input('description'));

        //return new membership with collection included
        $membership = $collection->memberships()->first();
        $membership->collection = $collection;
        return response()->success(['membership' => $membership]);
    }

    /**
    * Update the collection
    *
    * @param  int  $id
    * @return Response (includes newly updated collection)
    */

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required'
        ]);
        if ($validator->fails()) {
            return response()->error(400, ['The name field is required.']);
        }

        $collection = Collection::findOrFail($id);
        if (!$collection->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $collection->update($request->only(['name', 'description']));
        return response()->success(['collection' => $collection->toArray()]);
    }
}
