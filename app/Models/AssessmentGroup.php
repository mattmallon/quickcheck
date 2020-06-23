<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model as Eloquent;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Classes\Permissions\MembershipPermissionsInterface;

class AssessmentGroup extends Eloquent implements MembershipPermissionsInterface {
    use SoftDeletes;
    protected $table = 'assessment_groups';
    protected $fillable = [
        'collection_id',
        'name'
    ];

    public function assessments() {
        return $this->hasMany('App\Models\Assessment');
    }

    public function collection() {
        return $this->belongsTo('App\Models\Collection');
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Determine if currently logged in user has access to view assessment group
    *
    * @param  User $user
    * @return boolean
    */

    public function canUserRead($user) {
        $collection = $this->collection;
        $membership = new Membership();
        if ($membership->canReadFromCollection($collection, $user)) {
            return true;
        }

        return false;
    }

    /**
    * Determine if currently logged in user has access to edit assessment group
    *
    * @param  User $user
    * @return boolean
    */

    public function canUserWrite($user) {
        $collection = $this->collection;
        $membership = new Membership();
        if ($membership->canWriteToCollection($collection, $user)) {
            return true;
        }

        return false;
    }
}
