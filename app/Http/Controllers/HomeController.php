<?php
use Illuminate\Http\Request;
use App\Classes\LTI\LtiContext;
use App\Models\User;
use App\Classes\LTI\LtiConfig;

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
        $isInstructor = $ltiContext->isInstructor();
        $isLti = $ltiContext->isInLtiContext();

        //$contextId = $ltiContext->getContextIdFromSession();
        $contextId = null;

        //if a student, redirect to their view with context ID as query param
        if (User::isStudentViewingResults()) {
            return redirect('student?context=' . $contextId);
        }
        //if an instructor and an LTI launch, redirect so context id is passed as query param;
        //query param ensures user can have multiple courses open in different tabs simultaneously
        else if ($isInstructor && $isLti) {
            if ($request->has("context")) { //after the redirect grab the query param
                return displaySPA();
            }
            else { //when we hit the route initially, need to add a query param on for context
                $redirectUrl = 'home?context=' . $contextId;
                if ($request->has('sessionexpired')) { //if redirected due to session error
                    $redirectUrl .= '&sessionexpired=true';
                }
                return redirect($redirectUrl);
            }
        }
        //if an instructor and launching from CAS
        else if (User::getCurrentUser()) {
            return displaySPA();
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
