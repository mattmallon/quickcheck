<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model as Eloquent;
use App\Classes\ExternalData\CanvasAPI;
use Log;
use Illuminate\Support\Str;

class User extends Eloquent {
    protected $table = 'users';
    protected $fillable = ['admin', 'api_token'];

    public function memberships() {
        return $this->hasMany('App\Models\Membership');
    }

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Determine if user already exists
    *
    * @param  string  $username
    * @return boolean
    */

    public static function doesUserExist($username) {
        if (!$username) {
            return false;
        }

        $result = User::where('username', '=', $username);
        if ($result->count() === 1) {
            return true;
        }

        return false;
    }

    /**
    * Retrieve user from database by API token
    *
    * @param  string $apiToken
    * @return User
    */

    public static function findByApiToken($apiToken)
    {
        $user = User::where('api_token', $apiToken)->firstOrFail();
        return $user;
    }

    /**
    * Return the Quick Check-specific API token of the user
    *
    * @return str
    */

    public function getApiToken()
    {
        return $this->api_token;
    }

    /**
    * Get the current logged in user
    *
    * @return User
    */

    public static function getCurrentUser(Request $request) {
        return $request->user;
    }

    /**
    * Get the username of the currently logged-in user
    *
    * @return string
    */

    public static function getCurrentUsername(Request $request) {
        return $request->user->username;
    }

    /**
    * Return the user based on username
    *
    * @param  string  $username
    * @return User
    */

    public static function getUserFromUsername($username)
    {
        if (!$username) {
            return false;
        }

        $user = User::where('username', '=', $username)->first();
        if (!$user) {
            return null;
        }
        return $user;
    }

    /**
    * Get a list of all users in a course and their related group information;
    * this is not used in app operations, but instead an auxillary function to
    * enable a CSV download of this information for analytical-minded instructors
    *
    * @param  int  $courseId
    * @return []
    */

    public function getUsersInGroups($courseId) {
        $canvasAPI = new CanvasAPI;
        $users = $canvasAPI->getUsersFromAPI($courseId);
        $users = array_values($users); //convert from hash-indexed to simple array
        $groups = $canvasAPI->getCourseGroups($courseId);
        foreach($groups as &$group) {
            $group['users'] = $canvasAPI->getGroupUsers($group['id']);
        }
        foreach($users as &$user) {
            $user['group'] = $this->matchUserToGroup($user['id'], $groups);
        }
        return $users;
    }

    /**
    * Determine if the current logged-in user has admin privileges
    *
    * @return boolean
    */

    public function isAdmin() {
        if ($this->admin == 'true') {
            return true;
        }
        else {
            return false;
        }
    }

    /**
    * Save a new user (instructor or staff only)
    *
    * @param  string  $username
    * @return mixed   User on success, false if user already exists
    */

    public static function saveUser($username) {
        $new_user = new User;
        if (User::where('username', '=', $username)->get()->count() > 0) {
            return false;
        }

        $new_user->username = $username;
        $new_user->api_token = Str::random(60);
        $new_user->save();
        return $new_user;
    }

    /**
    * Update an existing user to add an API token, which was not formerly saved on this model
    *
    * @return void
    */

    public function setApiToken()
    {
        $this->api_token = Str::random(60);
        $this->save();
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Match a user to a group in a course, retrieved from the Canvas API
    *
    * @param  int  $userId
    * @param  []   $groups
    * @return string
    */

    private function matchUserToGroup($userId, $groups) {
        foreach($groups as $group) {
            foreach($group['users'] as $user) {
                if ($user['id'] == $userId) {
                    return $group['name'];
                }
            }
        }
        return 'NA';
    }
}
