<?php
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Collection;
use App\Models\Membership;

class MembershipController extends \BaseController {

    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * Get all users who have membership in this collection
    *
    * @return Response (includes array of users)
    */

    public function getCollectionMembership($id, Request $request)
    {
        $user = $request->user;
        $collection = Collection::findOrFail($id);
        if (!$collection->canUserRead($user)) {
            return response()->error(403);
        }
        $memberships = Membership::where('collection_id', '=', $id)->get();
        $users = array();
        foreach ($memberships as $membership) {
            $user = array();
            $user['id'] = $membership->user_id;
            $user['username'] = User::where('id', '=', $membership->user_id)->first()->username;
            $user['readOnly'] = $membership->read_only;
            array_push($users, $user);
        }
        return response()->success(['users' => $users]);
    }

    /**
    * Get all memberships for the current user
    *
    * @param  bool  $assessments (optional)
    * @return Response (includes memberships, optionally includes related assessments as well)
    */

    public function index(Request $request, $assessments = false)
    {
        $user = $request->user;
        $includes = ['collection'];
        if ($assessments) {
            $includes = array_merge($includes, ['collection.assessmentGroups', 'collection.assessmentGroups.assessments']);
        }

        $memberships = $user->memberships()
            ->with($includes)
            ->has('collection') //make sure memberships with soft-deleted collections not included
            ->get()
            ->toArray();

        return response()->success(['memberships' => $memberships]);
    }

    /**
    * Function for a user to invite another user to a collection
    *
    * @return Response (includes membership)
    */

    public function store(Request $request)
    {
        $username = $request->input('username');
        $collectionId = $request->input('collectionId');
        $readOnly = null;
        if ($request->has('readOnly')) {
            $readOnly = $request->input('readOnly');
        }

        $collection = Collection::findOrFail($collectionId);
        if (!$collection->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $user = User::where('username', '=', $username)->first();
        //if the user is not yet in the system, store the user
        if (!$user) {
            $user = User::saveUser($username);
        }
        $existingMembership = Membership::where('user_id', '=', $user->id)
            ->where('collection_id', '=', $collectionId)
            ->first();

        if ($existingMembership) {
            return response()->error(500, ['This user already has access to this collection']);
        }

        $membership = new Membership();
        $membership->user_id = $user->id;
        $membership->collection_id = $collectionId;
        $membership->read_only = $readOnly;
        $membership->save();
        return response()->success($membership->toArray());
    }

    /**
    * Update the permissions of all users who have membership in this collection
    *
    * @return Response (includes all memberships in the collection after the update)
    */

    public function updateCollectionMembership(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);
        if (!$collection->canUserWrite($request->user)) {
            return response()->error(403);
        }
        $users = $request->input('users');
        foreach ($users as $user) {
            $membership = Membership::where('collection_id', '=', $id)
                ->where('user_id', '=', $user['id'])
                ->firstOrFail();
            //delete users, if necessary
            if (array_key_exists('deleted', $user)) {
                $membership->delete();
            }
            //update read-only permissions, if necessary
            else if ($membership->read_only !== $user['readOnly']) {
                $membership->read_only = $user['readOnly'];
                $membership->update();
            }
        }
        $response = $this->getCollectionMembership($id);
        return $response;
    }
}
