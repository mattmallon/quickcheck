<?php

use Illuminate\Http\Request;
use App\Classes\LTI\LTIAdvantage;
use App\Classes\LTI\LtiConfig;

class LtiController extends \BaseController
{
    /**
    * Receive platform's OIDC initialization request and redirect back
    *
    * @return redirect
    */

    public function initializeOIDC(Request $request)
    {
        $lti = new LTIAdvantage();
        $redirectUrl = $lti->buildOIDCRedirectUrl();
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
