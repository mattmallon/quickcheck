<?php
use Illuminate\Http\Request;
use App\Classes\LTI\LtiContext;
use App\Models\Student;
use App\Models\User;
use App\Classes\LTI\LtiConfig;
use App\Classes\Auth\CASFilter;
use Illuminate\Support\Facades\Cache;

class HomeController extends BaseController
{
    /************************************************************************/
    /* VIEW ENDPOINTS *******************************************************/
    /************************************************************************/

    /**
    * Show the home page in the manage view.
    * For students, return the view with released results.
    * For instructors logged in via LTI, show instructor home with contextId attached as query param.
    * For instructors who have previously used the system but are not currently launching through LTI,
    * show them the home page without the context ID (allows edits, but no course-specific student
    * results). In this case, the instructor has authenticated through CAS rather than LTI. CAS auth
    * is only enabled for Indiana University; other universities must rely on LTI authentication.
    *
    * @param  int  $id
    * @return View
    */

    public function home(Request $request)
    {
        $ltiContext = new LtiContext;
        $ltiContext->setLaunchValues($request->ltiLaunchValues); //will be NULL if not an LTI launch
        $isLtiLaunch = $ltiContext->isInLtiContext();
        $isInstructor = false;
        $role = null;
        $user = null;
        $nonce = null;
        $contextId = null;
        $redirectForAuth = false;

        //if coming directly from an LTI launch, redirect to either student or instructor page depending
        //on role. add query params and redirect so user can authenticate and obtain an API token if needed.
        if ($isLtiLaunch) {
            $contextId = $ltiContext->getContextId();
            $isInstructor = $ltiContext->isInstructor();
            $role = $isInstructor ? 'instructor' : 'student';
            $nonce = $ltiContext->getNonce();

            if ($isInstructor) {
                $username = $ltiContext->getUserLoginId();
                $user = User::getUserFromUsername($username);
                if (!$user) {
                    abort(500, 'User not found when attempting instructor LTI login');
                }
            }
            else {
                $canvasUserId = $ltiContext->getUserId();
                $user = Student::findByCanvasUserId($canvasUserId);
            }

            $redirectForAuth = true;
        }

        //if already in an LTI context, display the page, and the front-end will either send
        //authenticated API requests if API token present, or request an API token given query params;
        //if user is unauthorized, they won't receive data without an API token and can't authenticate
        //without valid query params that match up with the cache; cache is removed as soon as it's
        //used in a valid request by an instructor coming off of an LTI launch.
        if ($request->has("context")) {
            return displaySPA();
        }

        //casticket present in query params; do CAS lookup to verify user is authorized and an existing instructor.
        //append query params and redirect, using the same formula as used in an LTI launch.
        if ($request->has('casticket')) {
            $casFilter = new CASFilter();
            $casTicket = $request->get('casticket');
            $username = $casFilter->getUsernameFromCasTicket($casTicket);
            $user = User::getUserFromUsername($username);
            if (!$user) {
                abort(500, 'User not found when attempting instructor CAS login');
            }

            $isInstructor = true; //we only get here if user already present in users table from previous instructor LTI launch
            $role = 'instructor';
            $nonce = 'cas-' . $casTicket;
            $redirectForAuth = true;
        }

        //if we have a valid LTI launch or CAS redirect, cache the nonce, role, and user ID, and redirect for auth
        //to obtain an API token. then remove that item from the cache so it can only be used once per launch.
        if ($redirectForAuth) {
            //prefix nonce with role to prevent spoofing of query params. we need to know if a student or an
            //instructor because they are in separate database tables/models. however, if a user alters the
            //query params from "student" to "instructor" when obtaining an API token, and they have a valid
            //nonce from a launch that hasn't been removed yet from the cache, AND their user ID happens to be
            //the same as an instructor, there's a small chance they could get an instructor's API token. it's
            //incredibly unlikely, but this extra bit of security will make sure that it's impossible and that
            //what is in the query params is matching exactly what we have already put in the back-end cache.
            $userId = $user->id;
            Cache::put($role . '-' . $nonce, $userId, now()->addMinutes(5));

            $redirectUrl = $isInstructor ? 'home' : 'student';
            $redirectUrl .= ('?role=' . $role);
            $redirectUrl .= ('&userId=' . $userId);
            $redirectUrl .= ('&nonce=' . $nonce);
            if ($contextId) {
                $redirectUrl .= ('&context=' . $contextId);
            }

            return redirect($redirectUrl);
        }

        //if no auth whatsoever, it's an initial home page visit when CAS authenticating but not authenticated yet
        $casFilter = new CASFilter();
        if ($casFilter->casEnabled()) {
            $redirectUrl = $casFilter->getRedirectUrl();
            return redirect($redirectUrl);
        }
        else {
            abort(403, 'Unauthorized: please launch the tool from an external tool launch in Canvas.');
        }
    }

    /**
    * TODO: probably need a new LTI controller now that all these new endpoints are getting added
    * Receive platform's OIDC initialization request and redirect back
    *
    * @return redirect
    */

    public function initializeOIDC(Request $request)
    {
        //TODO: put this somewhere reusable after figuring out how it works;
        //state and nonce are both stored in session, need to reference later;
        //not sure if it's a better idea to make OIDC class or keep this in LTI Advantage class
        //TODO: add validation to make sure all values are present and not null
        $iss = $request->input('iss');
        $loginHint = $request->input('login_hint');
        //NOTE: the target link uri is specific to the resource, so if launching from nav, it's the nav launch url
        //rather than the default target link uri set on the tool, so that's good news.
        $targetLinkUri = $request->input('target_link_uri');
        $ltiMessageHint = $request->input('lti_message_hint');

        if ($iss !== 'https://canvas.instructure.com' && $iss !== 'https://canvas.beta.instructure.com' && $iss !== 'https://canvas.test.instructure.com') {
            return response()->error(400, ['OIDC issuer does not match Canvas url.']);
        }

        $redirectUrl = $iss . '/api/lti/authorize_redirect';

        //TODO: does this happen on EVERY LTI launch? So would we potentially have
        //a race condition in the session if multiple tabs opened in quick succession?
        //Would we maybe just keep a single state/nonce in session and only put it in the
        //session if not already there, otherwise don't update? Doesn't that defeat the
        //purpose of a unique state/nonce in the first place, though? Use an array maybe?
        $state = uniqid('state-');
        $nonce = uniqid('nonce-');
        Session::put('ltiLaunchState', $state);
        Session::put('ltiLaunchNonce', $nonce);

        $authParams = [
            'scope' => 'openid', // OIDC scope
            'response_type' => 'id_token', // OIDC response is always an id token
            'response_mode' => 'form_post', // OIDC response is always a form post
            'prompt' => 'none', // don't prompt user on redirect
            'client_id' => env('LTI_CLIENT_ID'), //registered developer key ID in Canvas
            'redirect_uri' => $targetLinkUri,
            'state' => $state,
            'nonce' => $nonce,
            'login_hint' => $loginHint,
            'lti_message_hint' => $ltiMessageHint
        ];

        $redirectUrl .= ('?' . http_build_query($authParams));

        return redirect($redirectUrl);
    }

    /**
    * Return LTI config information for LTI installation
    *
    * @return response (json)
    */

    public function returnLtiConfig()
    {
        $ltiConfig = new LtiConfig();
        $configFile = $ltiConfig->createConfigFile();
        return response()->json($configFile, 200);
    }
}
