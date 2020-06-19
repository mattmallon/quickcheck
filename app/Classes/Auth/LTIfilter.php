<?php

namespace App\Classes\Auth;
use Session;
use App;
use App\Models\User;
use App\Classes\LTI\LtiContext;

class LTIFilter {

    private $request;

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    public function __construct($request) {
        $this->request = $request;
    }

    /**
    * Only allow instructors/designers/admins through for data entry, not students
    *
    * @return mixed (bool: false on success, no redirect necessary; string: redirect url on failure)
    */

    public function dataEntryFilter()
    {
        $context = new LtiContext;
        $context->initContext($this->request);
        //add decoded LTI launch values to request so they can be retrieved in the controller, etc.
        $this->request->merge(['ltiLaunchValues' => $context->getLaunchValues()]);

        if (!$context->isInstructor()) {
            //return redirect url for user not found if a student tries to access this route
            return 'usernotfound';
        }

        $username = $context->getUserLoginId();

        //M. Mallon, 6/3/20: add API token to model for existing users;
        //we'll have to rewrite this function or remove it later, but don't want to forget this logic
        $user = User::getUserFromUsername($username);
        if (!$user->getApiToken()) {
            $user->setApiToken();
        }

        return false;
    }

    /**
    * For the manage view/home page when accessing from left nav; could be either student or instructor
    *
    * @return boolean
    */

    public function manageFilter()
    {
        $context = new LtiContext;
        $context->initContext($this->request);
        //add decoded LTI launch values to request so they can be retrieved in the controller, etc.
        $this->request->merge(['ltiLaunchValues' => $context->getLaunchValues()]);

        return false;
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Create active session; see if user already exists, and if not, add them to the database
    *
    * @param  string  $username
    * @return void
    */

    private function instructorLogin($username)
    {
        Session::put('user', $username);
        //if user hasn't logged in before, but they are an instructor in the course,
        //add them as a user to the database
        if (!User::doesUserExist($username)) {
            User::saveUser($username);
        }
        //if instructor was in student view and switched back, remove so student view does not appear
        $this->studentLogout();
    }

    /**
    * Create active session for student; student usernames are not added to the database, so no
    * further action is required.
    *
    * @param  string  $username
    * @return void
    */

    private function studentLogin($username)
    {
        Session::put('student', $username);
    }

    /**
    * Delete student info from session; really only needed for instructors switching from Canvas student view
    *
    * @return void
    */

    private function studentLogout()
    {
        Session::forget('student');
    }
}
