<?php

namespace App\Classes\LTI;

use Illuminate\Http\Request;
use \Firebase\JWT\JWT;
use DateTime;

class LTIAdvantage {
    private $aud;
    private $iss;
    private $deploymentKey;
    private $jwtHeader;
    private $jwtBody;
    private $jwtSignature;
    private $oauthHeader;
    private $publicKey;
    private $request = false;
    public $launchValues;
    public $valid;

    public function __construct() {
        $this->valid = false;
        $this->request = request();
        $this->oauthTokenEndpoint = 'http://lti-ri.imsglobal.org/platforms/3/access_tokens';
        $this->decodeLaunchJwt();

        //TODO: Supposedly this is something that typically happens out of band,
        //rather than on an LTI launch? So this may have to move once Canvas is ready.
        if (!$this->isToolRegistered()) {
            $this->registerTool();
        }
    }

    public function decodeLaunchJwt() {
        $rawJwt = $this->request->get('id_token');
        $splitJwt = explode('.', $rawJwt);
        $this->jwtHeader = json_decode(base64_decode($splitJwt[0]), true);
        $this->jwtBody = json_decode(base64_decode($splitJwt[1]), true);
        $this->jwtSignature = json_decode(base64_decode($splitJwt[2]), true);
        $this->iss = $this->jwtBody['iss'];
        $this->aud = $this->jwtBody['aud'][0]; //assuming this is always an array of 1?
        $this->deploymentKey = $this->iss . $this->aud;
        $this->publicKey = $this->getPublicKey();

        //library checks the signature, makes sure it isn't expired, etc.
        $decodedJwt = JWT::decode($rawJwt, $this->publicKey, [$this->jwtHeader['alg']]);
        $this->launchValues = (array) $decodedJwt; //returns object; coerce into array
        //dd($this->launchValues);
    }

    public function initOauthToken() {
        $ltiAgs = (array) $this->launchValues['https://www.imsglobal.org/lti/ags'];
        //send JWT to get oauth token
        //JTI def:
        //Unique identifier for the JWT. Can be used to prevent the JWT from being replayed. This is helpful for a one time use token.
        $jwtToken = [
            "iss" => $this->iss,
            "aud" => $this->aud,
            "iat" => $this->launchValues['iat'],
            "exp" => $this->launchValues['exp'], //TODO: extend expiry time or use launch value?
            "jti" => uniqid()
        ];
        $privateKey = $this->getRsaKeyFromEnv('LTI_PRIVATE_KEY');
        $oauthRequestJWT = JWT::encode($jwtToken, $privateKey);
        $params = [];
        $params['grant_type'] = 'client_credentials';
        $params['client_assertion_type'] = urlencode('urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
        $params['client_assertion'] = $oauthRequestJWT;
        $scope = '';
        foreach($ltiAgs['scope'] as $scopeItem) {
            $scope .= urlencode($scopeItem . ' ');
        }
        $params['scope'] = $scope;
        $jsonResponse = $this->curlPost($this->oauthTokenEndpoint, [], $params);
        $response = json_decode($jsonResponse, true);
        $oauthToken = $response['access_token'];
        $tokenType = $response['token_type'];
        $this->oauthHeader = ['Authorization:' . $tokenType . ' ' . $oauthToken];
    }

    public function postScore() {
        $ltiAgs = (array) $this->launchValues['https://www.imsglobal.org/lti/ags'];
        $lineItemUrl = $ltiAgs['lineitem'];
        $lineItemsUrl = $ltiAgs['lineitems'];
        $currentTime = new DateTime();
        $timestamp = $currentTime->format(DateTime::ATOM); //ISO8601

        $sendResultUrl = $lineItemUrl . '/scores';
        $params = [
            "timestamp" => $timestamp,
            "scoreGiven" => 83,
            "scoreMaximum" => 100,
            "comment" => "This is exceptional work.",
            "activityProgress" => "Completed",
            "gradingProgress" => "Completed",
            "userId" => "5323497"
        ];

        $jsonResponse = $this->curlPost($sendResultUrl, $this->oauthHeader, $params);
        dd($jsonResponse);
    }

    public function readScore() {
        $ltiAgs = (array) $this->launchValues['https://www.imsglobal.org/lti/ags'];
        $lineItemUrl = $ltiAgs['lineitem'];
        $getResultUrl = $lineItemUrl . '/results';
        //get score after posting: currently a 404
        $jsonResponse = $this->curlGet($getResultUrl, $authHeader);
        dd($jsonResponse);
    }

    public function isToolRegistered() {
        //TEMP: using session for now, probably want to use DB in future
        //the issuer is the platform, and the audience is the tool deployment ID
        //that the platform is giving us. So we're asking, has this deployment
        //already been installed on this platform? It's up to the tool to determine.
        //The plan, I think, is to save the deployment in the DB and reference that in
        //the future to determine. Make sure the public key still matches.
        $deployment = $this->request->session()->get($this->deploymentKey);

        if (!$deployment) {
            return false;
        }

        if ($deployment !== $this->publicKey) {
            abort(500, 'Wrong public key.');
        }

        return true;
    }

    public function isLtiAdvantageRequest() {
        $ltiVersion = $this->launchValues['http://imsglobal.org/lti/version'];
        if ($ltiVersion != 'LTI-1p3') {
            abort(500, 'Invalid launch: LTI 1.3 required.');
        }

        return true;
    }

    public function registerTool() {
        $this->request->session()->put($this->deploymentKey, $this->publicKey);
    }

    private function getPublicKey() {
        return $this->getRsaKeyFromEnv('LTI_PUBLIC_KEY');
    }

    private function curlGet($url, $tokenHeader) {
        $ch = curl_init($url);
        curl_setopt ($ch, CURLOPT_URL, $url);
        curl_setopt ($ch, CURLOPT_HTTPHEADER, $tokenHeader);
        curl_setopt ($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // ask for results to be returned

        // Send to remote and return data to caller.
        $response = curl_exec($ch);
        curl_close($ch);
        return $response;
    }

    /**
    * Send a cURL POST request
    *
    * @param  string  $endpoint
    * @param  []      $headers
    * @param  string  $xml
    * @return string
    */

    private function curlPost($endpoint, $headers, $params)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt ($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        curl_close($ch);
        return $result;
    }

    private function getRsaKeyFromEnv($envVar) {
        $initialValue = env($envVar);
        #source for this tomfoolery:
        #https://laracasts.com/discuss/channels/general-discussion/multi-line-environment-variable
        $parsedValue = str_replace('\\n', "\n", $initialValue);
        return $parsedValue;
    }
}