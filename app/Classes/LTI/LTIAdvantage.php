<?php

namespace App\Classes\LTI;

use Illuminate\Http\Request;
use \Firebase\JWT\JWT;
use \Firebase\JWT\JWK;
use DateTime;
use Illuminate\Support\Facades\Cache;

class LTIAdvantage {
    private $aud;
    private $iss;
    private $jwtHeader;
    private $jwtBody;
    private $jwtSignature;
    private $oauthHeader;
    private $oauthTokenEndpoint;
    private $publicKey;
    private $request = false;
    public $launchValues;
    public $valid = false;

    public function __construct() {
        $this->request = request();
    }

    public function buildOIDCRedirectUrl() {
        $iss = $this->request->input('iss');
        $loginHint = $this->request->input('login_hint');
        //NOTE: the target link uri is specific to the resource, so if launching from nav, it's the nav launch url
        //rather than the default target link uri set on the tool, so that's good news.
        $targetLinkUri = $this->request->input('target_link_uri');
        $ltiMessageHint = $this->request->input('lti_message_hint');

        if ($iss !== 'https://canvas.instructure.com' && $iss !== 'https://canvas.beta.instructure.com' && $iss !== 'https://canvas.test.instructure.com') {
            return response()->error(400, ['OIDC issuer does not match Canvas url.']);
        }

        $redirectUrl = $iss . '/api/lti/authorize_redirect';

        //state and nonce are validated after the redirect to ensure they match, then removed
        $state = uniqid('state-', true);
        $nonce = uniqid('nonce-', true);
        Cache::put($state, $nonce, now()->addMinutes(5));

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

        return $redirectUrl;
    }

    public function decodeLaunchJwt() {
        $rawJwt = $this->request->get('id_token');
        if (!$rawJwt) {
            abort(400, 'LTI launch error: JWT id token missing.');
        }

        $splitJwt = explode('.', $rawJwt);
        if (count($splitJwt) !== 3) {
            abort(400, 'LTI launch error: incorrect JWT length.');
        }

        $this->jwtHeader = json_decode(JWT::urlsafeB64Decode($splitJwt[0]), true);
        $this->jwtBody = json_decode(JWT::urlsafeB64Decode($splitJwt[1]), true);
        $this->jwtSignature = json_decode(JWT::urlsafeB64Decode($splitJwt[2]), true);
        $this->iss = $this->jwtBody['iss'];
        $this->aud = $this->jwtBody['aud'];
        $this->publicKey = $this->getPublicKey();

        //library checks the signature, makes sure it isn't expired, etc.
        $decodedJwt = JWT::decode($rawJwt, $this->publicKey, [$this->jwtHeader['alg']]);
        $this->launchValues = (array) $decodedJwt; //returns object; coerce into array
    }

    public function getLaunchValues() {
        return (array) $this->launchValues;
    }

    public function initOauthToken() {
        $ltiAgs = (array) $this->launchValues['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'];
        $this->oauthTokenEndpoint = $this->iss . '/login/oauth2/token';
        //send JWT to get oauth token
        $jwtToken = [
            "iss" => env('LTI_CLIENT_ID'),
            "sub" => env('LTI_CLIENT_ID'),
            "aud" => $this->oauthTokenEndpoint,
            "iat" => time() - 5,
            "exp" => time() + 60,
            "jti" => 'lti-service-token' . hash('sha256', random_bytes(64)) //unique identifier to prevent replays
        ];

        $privateKey = $this->getRsaKeyFromEnv('LTI_PRIVATE_KEY');
        $kid = env('LTI_JWK_KID', null);
        $oauthRequestJWT = JWT::encode($jwtToken, $privateKey, $this->jwtHeader['alg'], $kid);
        $params = [];
        $params['grant_type'] = 'client_credentials';
        $params['client_assertion_type'] = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
        $params['client_assertion'] = $oauthRequestJWT;
        $scope = '';
        foreach($ltiAgs['scope'] as $scopeItem) {
            $scope .= ($scopeItem . ' ');
        }
        $params['scope'] = $scope;
        $jsonResponse = $this->curlPost($this->oauthTokenEndpoint, [], $params);
        dd($jsonResponse);
        $response = json_decode($jsonResponse, true);
        dd($response);
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

    public function isLtiAdvantageRequest() {
        $ltiVersion = $this->launchValues['http://imsglobal.org/lti/version'];
        if ($ltiVersion != 'LTI-1p3') {
            abort(500, 'Invalid launch: LTI 1.3 required.');
        }

        return true;
    }

    public function validateLaunch()
    {
        $this->decodeLaunchJwt();
        $this->validateStateAndNonce();
        $this->validateRegistration();
        $this->validateMessage();
    }

    private function getPublicKey() {
        //fetch revolving keys with KID
        $launchKID = $this->jwtHeader['kid'];
        $publicKey = Cache::get($launchKID);
        if (!$publicKey) {
            $publicKeyUrl = $this->iss . '/api/lti/security/jwks';
            $publicKeyJson = file_get_contents($publicKeyUrl);
            $publicKeySet = json_decode($publicKeyJson, true);
            $parsedPublicKeySet = JWK::parseKeySet($publicKeySet);
            foreach($parsedPublicKeySet as $kid => $publicKeyItem) {
                if ($kid == $launchKID) {
                    $publicKeyArray = openssl_pkey_get_details($publicKeyItem);
                    $publicKey = $publicKeyArray['key'];
                    //not sure how often Canvas updates public keys, looks like they last for months
                    //based on the KID values, but refreshing once a week to be on the safer side.
                    Cache::put($launchKID, $publicKey, now()->addWeeks(1));
                }
            }
        }

        $this->publicKey = $publicKey;

        if (!$this->publicKey) {
            abort(500, 'No public key found');
        }

        return $this->publicKey;
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
        //dd(base64_decode($initialValue));
        //return base64_decode($initialValue);
        //$initialValue = base64_decode($initialValue);
        #source for this tomfoolery:
        #https://laracasts.com/discuss/channels/general-discussion/multi-line-environment-variable
        //$parsedValue = str_replace('\\n', "\n", $initialValue);
        $parsedValue = str_replace('\n', '', $initialValue);
        //dd($parsedValue);
        return $parsedValue;
    }

    private function validateMessage()
    {
        if ($this->launchValues['https://purl.imsglobal.org/spec/lti/claim/version'] !== "1.3.0") {
            abort(400, 'LTI launch failed: incorrect LTI version.');
        }

        if (!$this->launchValues['https://purl.imsglobal.org/spec/lti/claim/message_type']) {
            abort(400, 'LTI launch failed: no message type provided.');
        }
    }

    private function validateRegistration()
    {
        $iss = $this->iss;
        $aud = $this->aud;
        $existingAud = env('LTI_CLIENT_ID');

        if ($iss !== 'https://canvas.instructure.com' && $iss !== 'https://canvas.beta.instructure.com' && $iss !== 'https://canvas.test.instructure.com') {
            abort(400, 'LTI launch failed: invalid issuer.');
        }

        if ($aud != $existingAud) {
            abort(400, 'LTI launch failed: invalid aud value.');
        }
    }

    private function validateStateAndNonce()
    {
        $state = $this->request->input('state');
        $nonce = $this->launchValues['nonce'];
        $existingNonce = Cache::pull($state);
        if (!$existingNonce) {
            abort(400, 'LTI launch failed: launch state and nonce do not match original values.');
        }
    }
}