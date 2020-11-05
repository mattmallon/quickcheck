<?php
use Illuminate\Http\Request;
use App\Classes\Auth\CASFilter;
use App\Classes\Auth\AuthFilter;

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
        $authFilter = new AuthFilter($request);

        //if we have a valid LTI launch or CAS redirect, cache the nonce, role, and user ID, and redirect for auth
        //to obtain an API token. Then remove that item from the cache so it can only be used once per launch.
        if ($authFilter->isLtiLaunch() || $authFilter->isCasRedirect()) {
            $redirectUrl = $authFilter->buildRedirectUrl();
            return redirect($redirectUrl);
        }

        //if already in an LTI context, display the page, and the front-end will either send
        //authenticated API requests if API token present, or request an API token given query params;
        //if user is unauthorized, they won't receive data without an API token and can't authenticate
        //without valid query params that match up with the cache; cache is removed as soon as it's
        //used in a valid request by an instructor coming off of an LTI launch.
        if ($authFilter->isValidRedirect()) {
            return displaySPA();
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
}
