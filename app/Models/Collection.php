<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model as Eloquent;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Classes\Permissions\MembershipPermissionsInterface;

class Collection extends Eloquent implements MembershipPermissionsInterface {
    use SoftDeletes;
    protected $table = 'collections';
    protected $fillable = [
        'name',
        'owner',
        'description'
    ];

    public function assessmentGroups() {
        return $this->hasMany('App\Models\AssessmentGroup');
    }

    public function collectionFeatures() {
        return $this->hasMany('App\Models\CollectionFeature');
    }

    public function memberships() {
        return $this->hasMany('App\Models\Membership');
    }

    public function userMembership() {
        //technically many memberships on the collection, but just one where it's potentially the current user,
        //query is constrained in the caller, as request parameter cannot be passed into a relationship function
        return $this->hasOne('App\Models\Membership');
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Determine if currently logged in user has access to view collection
    *
    * @param  User $user
    * @return boolean
    */

    public function canUserRead($user) {
        $membership = new Membership();
        if ($membership->canReadFromCollection($this, $user)) {
            return true;
        }

        return false;
    }

    /**
    * Determine if currently logged in user has access to edit collection
    *
    * @param  User $user
    * @return boolean
    */

    public function canUserWrite($user) {
        $membership = new Membership();
        if ($membership->canWriteToCollection($this, $user)) {
            return true;
        }

        return false;
    }

    /**
    * Determine if collection is public
    *
    * @return boolean
    */

    public function isPublic() {
        if ($this->public_collection === 'true') {
            return true;
        }

        return false;
    }

    /**
    * Save a collection
    *
    * @param  string  $name
    * @param  User    $user
    * @param  string  $description
    * @return void
    */

    public function storeCollection($name, $user, $description = null) {
        $this->name = $name;
        $this->owner = $user->username;
        if ($description) { //optional
            $this->description = $description;
        }
        //note: public_collection column cannot be filled when creating collection,
        //but can only be applied at the endpoint for specifically making the
        //collection public; this is to prevent making a collection
        //publicly viewable to users before any assessments have been added
        $this->save();

        //add user as member to collection
        $membership = Membership::addMembership($user->id, $this->id);

        //toggle default features for collection
        $collectionFeature = new CollectionFeature;
        $collectionFeature->addDefaultFeatures($this->id);
    }
}
