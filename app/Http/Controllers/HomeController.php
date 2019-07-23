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
        $contextId = $ltiContext->getContextIdFromSession();
        //if a student, redirect to their view with context ID as query param
        if (User::isStudentViewingResults()) {
            return redirect('student?context=' . $contextId);
        }
        //if an instructor and an LTI launch, redirect so context id is passed as query param;
        //query param ensures user can have multiple courses open in different tabs simultaneously
        else if ($isInstructor && $isLti) {
            if ($request->has("context")) { //after the redirect grab the query param
                return view('home');
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
            return view('home');
        }
    }

    /**
    * Return LTI config information for LTI installation
    *
    * @return response (in XML)
    */

    public function returnLtiConfig()
    {
        $ltiConfig = new LtiConfig();
        $configFile = $ltiConfig->createConfigFile();
        return response()->json($configFile, 200);
    }
}
