<?php

namespace App\Classes\Auth;
use App;
use Redirect;
use App\Models\User;

class CASFilter
{
    private $permissionCode = "ANY";
    //TODO: if this doesn't work with env, may have to create a constructor function
    private $appUrl = env('APP_URL') . '/home';

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    /**
    * Determine if CAS is enabled for the app; currently only enabled for Indiana University.
    * For running the app locally, also allow, as we set automatic auth in that case.
    *
    * @return boolean
    */

    public function casEnabled()
    {
        $currentEnvironment = env('APP_ENV');
        if (strpos($this->appUrl, 'iu.edu') !== false || $currentEnvironment === 'local' || $currentEnvironment === 'dev') {
            return true;
        }

        return false;
    }

    /**
    * Redirect for CAS authentication
    *
    * @return mixed (string: $redirectUrl, if needs redirect; otherwise, bool, false if no redirect needed)
    */

    public function getRedirectUrl()
    {
        //See this page for the example: https://github.iu.edu/UITS-IMS/CasIntegrationExamples/blob/master/php_cas_example%203.php
        //KB on CAS: https://kb.iu.edu/d/atfc

        //for local dev environment, don't go through CAS flow, redirect on to home page and the cas ticket
        //will not be authenticated if that environment, test instructor credentials will be set instead.
        if (App::environment('local')) {
            return $this->appUrl . '?casticket=localdevdummyvalue';
        }

        if (!isset($_GET["casticket"])) {
            return $this->redirectCasLogin();
        }

        //we shouldn't get to this point, but just in case...
        return 'usernotfound';
    }

    public function getUsernameFromCasTicket($casTicket)
    {
        $casAnswer = $this->getCasAnswer();
        //split CAS answer into access and user
        list($access,$username) = explode("\n",$casAnswer,2);
        $access = trim($access);
        $username = trim($username);

        if ($access !== "yes") {
            return false;
        }

        return $username;
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Send cURL request for CAS answer
    *
    * @return [] $casAnswer
    */

    private function getCasAnswer($casTicket)
    {
        //set up validation URL to ask CAS if ticket is good
        $_url = 'https://cas.iu.edu/cas/validate';
        $cassvc = $this->permissionCode;
        $casurl = $this->appUrl;
        $params = "cassvc=$cassvc&casticket=$casTicket&casurl=$casurl";
        $urlNew = "$_url?$params";

        //CAS sending response on 2 lines. First line contains "yes" or "no". If "yes", second line contains username (otherwise, it is empty).
        $ch = curl_init();
        $timeout = 5; // set to zero for no timeout
        curl_setopt ($ch, CURLOPT_URL, $urlNew);
        curl_setopt ($ch, CURLOPT_CONNECTTIMEOUT, $timeout);
        ob_start();
        curl_exec($ch);
        curl_close($ch);
        $casAnswer = ob_get_contents();
        ob_end_clean();
        return $casAnswer;
    }

    /**
    * Redirect to the CAS login page if the user is not currently logged in
    *
    * @return string $redirectUrl
    */

    private function redirectCasLogin()
    {
        $redirectUrl = 'https://cas.iu.edu/cas/login?cassvc=' . $this->permissionCode . '&casurl=' . $this->appUrl;
        return $redirectUrl;
    }

    /**
    * Local permissions are a bit different, since redirecting back to localhost creates a CAS error.
    * Add a username that is NOT valid in CAS, but used locally and seeded in database. Set auth = true.
    *
    * @return void
    */

    private function setLocalAuth()
    {
        //locally, you can comment out either Session line below to test what an admin vs. instructor sees
        Session::put('user', 'testinstructor');
        //Session::put('user', 'testadmin');
        $authenticated = true; //if on a local machine for development, skip all the CAS business
    }
}
