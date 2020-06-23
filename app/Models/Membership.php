<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model as Eloquent;

class Membership extends Eloquent {
    protected $table = 'memberships';
    protected $fillable = [
        'user_id',
        'collection_id',
        'read_only'
    ];

    public function user() {
        return $this->belongsTo('App\Models\User');
    }

    public function collection() {
        return $this->belongsTo('App\Models\Collection');
    }

    public function scopeCurrentUser($query, $request) {
        $user = $request->user;
        return $query->where('user_id', '=', $user->id);
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Add a new membership to a collection
    *
    * @param  int  $userId
    * @param  int  $collectionId
    * @return boolean (true on success)
    */

    public static function addMembership($userId, $collectionId) {
        $membership = new Membership();
        $membership->user_id = $userId;
        $membership->collection_id = $collectionId;
        $membership->save();
        return true;
    }

    /**
    * Determine if user has appropriate permissions to view a collection
    *
    * @param  Collection  $collection
    * @param  User        $user
    * @return boolean
    */

    public function canReadFromCollection(Collection $collection, User $user) {
        if ($user->isAdmin()) {
            return true;
        }

        $membership = $this->getCollectionMembership($user, $collection);
        if ($membership) {
            return true;
        }

        return false;
    }

    /**
    * Determine if user has appropriate permissions to modify a collection
    *
    * @param  Collection  $collection
    * @param  User        $user
    * @return boolean
    */

    public function canWriteToCollection(Collection $collection, User $user) {
        if ($user->isAdmin()) {
            return true;
        }

        $membership = $this->getCollectionMembership($user, $collection);
        if ($membership) {
            if (!$membership->isReadOnly()) {
                return true;
            }
        }

        return false;
    }

    /**
    * Get a user's membership to a collection
    *
    * @param  User        $user
    * @param  Collection  $collection
    * @return Membership
    */

    public function getCollectionMembership(User $user, Collection $collection) {
        $membership = Membership::where('user_id', '=', $user->id)
            ->where('collection_id', '=', $collection->id)
            ->first();

        return $membership;
    }

    /**
    * Determine if user's membership is read only
    *
    * @return boolean
    */

    public function isReadOnly() {
        if ($this->read_only === 'true') {
            return true;
        }

        return false;
    }
}
