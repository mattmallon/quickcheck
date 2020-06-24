<?php

namespace App\Classes\Auth;
use App\Classes\Auth\CASFilter;
use App\Classes\LTI\LtiContext;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AuthFilter
{
    private $casFilter;
    private $contextId = null;
    private $isInstructor = false;
    private $ltiContext;
    private $nonce;
    private $request;
    private $role;
    private $user;

    public function __construct(Request $request)
    {
        $this->request = $request;
        $this->ltiContext = new LtiContext;
        $this->ltiContext->setLaunchValues($request->ltiLaunchValues); //will be NULL if not an LTI launch
        $this->casFilter = new CASFilter;
    }

    /**
    * Do CAS lookup to verify user is authorized and an existing instructor;
    * Use CAS ticket as nonce
    *
    * @return void
    */

    public function buildCasParams()
    {
        $casTicket = $this->request->get('casticket');
        $username = $this->casFilter->getUsernameFromCasTicket($casTicket);
        $this->user = User::getUserFromUsername($username);

        if (!$this->user) {
            abort(500, 'User not found when attempting instructor CAS login');
        }

        $this->isInstructor = true; //we only get here if user already present in users table from previous instructor LTI launch
        $this->role = 'instructor';
        $this->nonce = 'cas-' . $casTicket;
    }

    /**
    * Use existing LTI context in request to obtain redirect params and verify user
    *
    * @return void
    */

    public function buildLtiParams()
    {
        $this->contextId = $this->ltiContext->getContextId();
        $this->isInstructor = $this->ltiContext->isInstructor();
        $this->role = $this->isInstructor ? 'instructor' : 'student';
        $this->nonce = $this->ltiContext->getNonce();

        if ($this->isInstructor) {
            $username = $this->ltiContext->getUserLoginId();
            $this->user = User::getUserFromUsername($username);
            if (!$this->user) {
                abort(403, 'User not found when attempting instructor LTI login');
            }
        }
        else {
            $canvasUserId = $this->ltiContext->getUserId();
            $this->user = Student::findByCanvasUserId($canvasUserId);
        }
    }

    /**
    * If we have a valid LTI launch or CAS redirect, cache the nonce, role, and user ID, and redirect for auth
    * to obtain an API token. Later, remove that item from the cache so it can only be used once per launch.
    *
    * @param   string $urlPath (default to NULL)
    * @return  string $redirectUrl
    */

    public function buildRedirectUrl($urlPath = null)
    {
        if ($this->isLtiLaunch()) {
            $this->buildLtiParams();
        }
        else if ($this->isCasRedirect()) {
            $this->buildCasParams();
        }
        else {
            abort(403, 'Invalid authentication request, required data not present.');
        }

        //prefix nonce with role to prevent spoofing of query params. we need to know if a student or an
        //instructor because they are in separate database tables/models. however, if a user alters the
        //query params from "student" to "instructor" when obtaining an API token, and they have a valid
        //nonce from a launch that hasn't been removed yet from the cache, AND their user ID happens to be
        //the same as an instructor, there's a small chance they could get an instructor's API token. it's
        //incredibly unlikely, but this extra bit of security will make sure that it's impossible and that
        //what is in the query params is matching exactly what we have already put in the back-end cache.
        $userId = $this->user->id;
        Cache::put($this->role . '-' . $this->nonce, $userId, now()->addMinutes(5));

        $redirectUrl = $urlPath;
        if (!$urlPath) {
            //default to left nav launch where we have to dynamically decide between instructor/student;
            //otherwise, all other launches are instructor-based and can be passed in as a param.
            $redirectUrl = $this->isInstructor ? 'home' : 'student';
        }

        $redirectUrl .= ('?role=' . $this->role);
        $redirectUrl .= ('&userId=' . $userId);
        $redirectUrl .= ('&nonce=' . $this->nonce);

        if ($this->contextId) {
            $redirectUrl .= ('&context=' . $this->contextId);
        }

        return $redirectUrl;
    }

    /**
    * CAS ticket present in query params
    *
    * @return void
    */

    public function isCasRedirect()
    {
        return $this->request->has('casticket');
    }

    /**
    * Search for LTI context in request chain
    *
    * @return void
    */

    public function isLtiLaunch()
    {
        return $this->ltiContext->isInLtiContext();
    }

    /**
    * Check query parameters to see if we have redirected properly and can display the SPA
    *
    * @return void
    */

    public function isValidRedirect()
    {
        if ($this->request->has('nonce') && $this->request->has('userId') && $this->request->has('role')) {
            return true;
        }

        return false;
    }
}