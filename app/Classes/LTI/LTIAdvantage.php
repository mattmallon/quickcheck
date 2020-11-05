<?php

namespace App\Classes\LTI;

use Illuminate\Http\Request;
use \Firebase\JWT\JWT;
use \Firebase\JWT\JWK;
use DateTime;
use Illuminate\Support\Facades\Cache;
use App\Exceptions\GradePassbackException;
use App\Classes\LTI\LtiConfig;

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

    public function __construct()
    {
        $this->request = request();
    }

    /**
    * The first step of the LTI launch: Canvas sends params to our tool and we need to redirect back
    * to Canvas with the parameters attached so that the LTI launch can be authenticated.
    *
    * @return string
    */

    public function buildOIDCRedirectUrl()
    {
        $iss = $this->request->input('iss');
        $loginHint = $this->request->input('login_hint');
        //NOTE: the target link uri is specific to the resource, so if launching from nav, it's the nav launch url, etc.
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

    /**
    * Determine if response in grade read/passback is due to error
    *
    * @param  string $response
    * @return void
    */

    private function checkForGradeErrors($data = null)
    {
        $unresponsiveErrorMessage = 'The Canvas gradebook is currently unresponsive. Please try again later.';

        if (is_null($data)) {
            throw new GradePassbackException($unresponsiveErrorMessage);
        }

        if (!array_key_exists('errors', $data)) {
            return;
        }

        $errors = $data['errors'];

        foreach ($errors as $error) {
            if ($this->isCanvasDown($error)) {
                throw new GradePassbackException($unresponsiveErrorMessage);
            }

            if ($this->isUserNotInCourse($error)) {
                $errorMessage = 'Canvas indicates that you are no longer enrolled in this course and cannot receive a grade.';
                throw new GradePassbackException($errorMessage);
            }

            if ($this->isAssignmentInvalid($error)) {
                $errorMessage = 'Canvas indicates that this assignment is invalid. It may have been closed, deleted, or unpublished after the quick check was opened.';
                throw new GradePassbackException($errorMessage);
            }
        }

        //if we have errors but not for a reason specified above...
        $errorMessage = 'Gradebook transaction unsuccessful.';
        throw new GradePassbackException($errorMessage);
    }

    /**
    * In order to send a deep linking request to Canvas to embed a Quick Check, we need to send
    * a JWT with the pertinent information in a specific format.
    *
    * @param  string $deploymentId
    * @param  string $launchUrl
    * @param  string $title
    * @return string $JWT
    */

    public function createDeepLinkingJwt($deploymentId, $launchUrl, $title)
    {
        $this->iss = $this->getIssuer();
        $resource = [
            "type" => "ltiResourceLink",
            "title" => $title,
            "url" => $launchUrl,
            "presentation" => [
                "documentTarget" => "iframe"
            ]
        ];

        $jwtData= [
            "iss" => env('LTI_CLIENT_ID'),
            "aud" => $this->iss,
            "exp" => time() + 600,
            "iat" => time(),
            "nonce" => hash('sha256', random_bytes(64)),
            "https://purl.imsglobal.org/spec/lti/claim/deployment_id" => $deploymentId,
            "https://purl.imsglobal.org/spec/lti/claim/message_type" => "LtiDeepLinkingResponse",
            "https://purl.imsglobal.org/spec/lti/claim/version" => "1.3.0",
            "https://purl.imsglobal.org/spec/lti-dl/claim/content_items" => [$resource]
        ];

        $privateKey = $this->getRsaKeyFromEnv('LTI_PRIVATE_KEY');
        $kid = env('LTI_JWK_KID', null);
        $jwt = JWT::encode($jwtData, $privateKey, 'RS256', $kid);

        return $jwt;
    }

    /**
    * Create a line item (assignment) in the Canvas gradebook
    *
    * @param  string $lineItemsUrl
    * @param  int    $scoreMaximum
    * @param  string $label
    * @return []     $data (data converted to associative array from JSON)
    */

    public function createLineItem($lineItemsUrl, $scoreMaximum, $label)
    {
        $this->initOauthToken();
        if (!$this->oauthHeader) {
            abort(500, 'Oauth token not set on user.');
        }

        $params = ['scoreMaximum' => $scoreMaximum, 'label' => $label, "resourceLinkId" => "0c46cc3f-f456-4a14-980f-2104a48bbc6d"];
        $jsonResponse = $this->curlPost($lineItemsUrl, $this->oauthHeader, $params);
        $data = $this->getResponseBody($jsonResponse);

        return $data;
    }

    /**
    * After the OIDC redirect, verify the jwt signature and decode the values
    *
    * @return void
    */

    public function decodeLaunchJwt()
    {
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
        $decodedJwt = JWT::decode($rawJwt, $this->publicKey, ['RS256']);
        $this->launchValues = (array) $decodedJwt; //returns object; coerce into array
        //dd($this->launchValues); //un-comment for debugging, to see launch values
    }

    /**
    * Get all line items for the course
    *
    * @param  string $response
    * @return  []    $data (data converted to associative array from JSON)
    */

    public function getAllLineItems($lineItemsUrl)
    {
        $this->initOauthToken();
        if (!$this->oauthHeader) {
            abort(500, 'Oauth token not set on user.');
        }

        $jsonResponse = $this->curlGet($lineItemsUrl, $this->oauthHeader);
        $data = $this->getResponseBody($jsonResponse);

        return $data;
    }

    /**
    * Get the issuer of the JWT (i.e., canvas test, canvas prod, etc.) from the JWT launch data
    *
    * @return string
    */

    public function getIssuer()
    {
        $iss = $this->iss;

        if (!$iss) {
            $canvasDomain = env('CANVAS_API_DOMAIN', 'https://iu.instructure.com/api/v1');
            if (strpos($canvasDomain, 'test')) {
                $iss = 'https://canvas.test.instructure.com';
            }
            else if (strpos($canvasDomain, 'beta')) {
                $iss = 'https://canvas.beta.instructure.com';
            }
            else {
                $iss = 'https://canvas.instructure.com';
            }
        }

        return $iss;
    }

    /**
    * Get all decoded LTI launch values for the user's launch
    *
    * @return []
    */

    public function getLaunchValues()
    {
        return (array) $this->launchValues;
    }

    /**
    * Get a single line item
    *
    * @param  string $lineItemUrl
    * @return []     $data (data converted to associative array from JSON)
    */

    public function getLineItem($lineItemUrl)
    {
        $this->initOauthToken();
        if (!$this->oauthHeader) {
            abort(500, 'Oauth token not set on user.');
        }

        $jsonResponse = $this->curlGet($lineItemUrl, $this->oauthHeader);
        $data = $this->getResponseBody($jsonResponse);

        return $data;
    }
    /**
    * Get all memberships in the course from the names and roles provisioning service
    *
    * @param  string $membershipsUrl
    * @return []    $data (data converted to associative array from JSON)
    */

    public function getMemberships($membershipsUrl)
    {
        $this->initOauthToken();
        if (!$this->oauthHeader) {
            abort(500, 'Oauth token not set on user.');
        }

        $jsonResponse = $this->curlGet($membershipsUrl, $this->oauthHeader);
        $data = $this->getResponseBody($jsonResponse);

        return $data;
    }

    /**
    * Get a student's result for a line item (numeric score, possibly null if un-attempted or if not a student)
    *
    * @param  string $lineItemUrl
    * @param  int    $userId
    * @return int (nullable)
    */

    public function getResult($lineItemUrl, $userId)
    {
        $this->initOauthToken();
        if (!$this->oauthHeader) {
            abort(500, 'Oauth token not set on user.');
        }

        $resultUrl = $lineItemUrl . '/results?user_id=' . $userId;
        $jsonResponse = $this->curlGet($resultUrl, $this->oauthHeader);
        $data = $this->getResponseBody($jsonResponse);
        $this->checkForGradeErrors($data);

        if (!$data) {
            return null;
        }

        $result = $data[0];
        $resultScore = null;
        $resultMaximum = null;
        $score = null;

        if (array_key_exists('resultScore', $result)) {
            return $result['resultScore'];
        }

        return null;
    }

    /**
    * Retrieve oauth token from Canvas so we can make requests to assignment/grading and memberships/roles services
    *
    * @return string $oauthToken
    */

    public function getOauthTokenFromCanvas()
    {
        $this->iss = $this->getIssuer();
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
        $oauthRequestJWT = JWT::encode($jwtToken, $privateKey, 'RS256', $kid);
        $params = [];
        $params['grant_type'] = 'client_credentials';
        $params['client_assertion_type'] = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
        $params['client_assertion'] = $oauthRequestJWT;
        $ltiConfig = new LtiConfig();
        //retrieve from config instead of launch in case oauth token needs refreshing and we no longer
        //have launch data available.
        $scopes = $ltiConfig->getScopes();
        $scope = '';
        foreach($scopes as $scopeItem) {
            $scope .= ($scopeItem . ' ');
        }
        $params['scope'] = $scope;
        $jsonResponse = $this->curlPost($this->oauthTokenEndpoint, [], $params);
        $response = json_decode($jsonResponse, true);
        $oauthToken = $response['access_token'];
        $this->oauthHeader = ['Authorization: Bearer ' . $oauthToken];

        return $oauthToken;
    }

    /**
    * Prepare oauth token before issuing a request to assignment/grade or membership/role services.
    * If the oauth token has previously been retrieved and is still valid, retrieve from cache.
    * If there is no oauth token in the cache (they expire every 60 minutes), retrieve from Canvas.
    * Note that a single oauth token is all that is needed for the entire app and can be used for
    * all users, courses, and LTI Advantage services.
    *
    * @param  string $response
    * @return void
    */

    public function initOauthToken()
    {
        $oauthToken = null;
        //issuer can be canvas prod, beta, or test; we will have the issuer if the oauth token
        //is being retrieved on an initial LTI launch, but might not have it for later requests.
        //use the Canvas API domain defined in the env to determine if no direct data.
        $iss = $this->getIssuer();
        $cacheKey = $iss . '-oauth-token';

        //find existing token in cache if possible
        $oauthToken = Cache::get($cacheKey);
        if (!$oauthToken) {
             //otherwise, run the flow to fetch one from Canvas
            $oauthToken = $this->getOauthTokenFromCanvas();
            //token ALWAYS expires in an hour and doesn't extend expiration time if used;
            //replace it a couple minutes shy to prevent failures.
            Cache::put($cacheKey, $oauthToken, now()->addMinutes(58));
        }

        $this->setOauthToken($oauthToken);
        return $oauthToken;
    }

    /**
    * Post a line item score for a student
    *
    * @param  string $lineItemUrl
    * @param  int    $userId
    * @param  string $activityProgress
    * @param  string $gradingProgress
    * @param  int    $scoreGiven
    * @param  int    $scoreMaximum
    * @return []     $data (data converted to associative array from JSON)
    */

    public function postScore($lineItemUrl, $userId, $activityProgress, $gradingProgress, $scoreGiven = null, $scoreMaximum = 1)
    {
        $this->initOauthToken();
        $currentTime = new DateTime();
        $timestamp = $currentTime->format(DateTime::ATOM); //ISO8601

        $sendResultUrl = $lineItemUrl . '/scores';
        $params = [
            "timestamp" => $timestamp,
            "activityProgress" => $activityProgress,
            "gradingProgress" => $gradingProgress,
            "userId" => $userId
        ];

        if ($scoreGiven) {
            $params["scoreGiven"] = $scoreGiven;
            $params["scoreMaximum"] = $scoreMaximum;
        }

        if (!$this->oauthHeader) {
            abort(500, 'Oauth token not set on user.');
        }

        $jsonResponse = $this->curlPost($sendResultUrl, $this->oauthHeader, $params);
        $data = json_decode($jsonResponse, true); //currently only returns "resultUrl" which we don't need
        $this->checkForGradeErrors($data);

        return $data;
    }

    /**
    * Set oauth authorization bearer header on the class to be used in requests to Canvas
    *
    * @param  string $oauthToken
    * @return void
    */

    public function setOauthToken($oauthToken)
    {
        $this->oauthHeader = ['Authorization: Bearer ' . $oauthToken];
    }

    /**
    * Determine if the launch is the correct LTI version
    *
    * @return bool
    */

    public function isLtiAdvantageRequest()
    {
        $ltiVersion = $this->launchValues['http://imsglobal.org/lti/version'];
        if ($ltiVersion != 'LTI-1p3') {
            abort(500, 'Invalid launch: LTI 1.3 required.');
        }

        return true;
    }

    /**
    * Validate and decode launch JWT; ensure state, nonce, registration, and LTI message type are valid;
    * also initialize oauth token so it can be used in requests to Canvas
    *
    * @return void
    */

    public function validateLaunch()
    {
        $this->decodeLaunchJwt();
        $this->validateStateAndNonce();
        $this->validateRegistration();
        $this->validateMessage();
        $this->initOauthToken();
    }

    /**
    * Get Canvas's public key from the rotating JWK set; we cache this value so we don't need to
    * send requests to Canvas on every single LTI launch. It looks like things are generally
    * rotated every month with Canvas, but we refresh every week to be safer. This public key
    * is needed to decode the JWT that Canvas sends us on launch.
    *
    * @return string
    */

    private function getPublicKey()
    {
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
    /**
    * Send a cURL GET request
    *
    * @param  string $url
    * @param  []     $tokenHeader
    * @return string
    */

    private function curlGet($url, $tokenHeader)
    {
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

    /**
    * Split header and body of JSON response when sending requests to Canvas services and return data in body
    *
    * @param  string $jsonResponse
    * @return []
    */

    private function getResponseBody($jsonResponse)
    {
        if (!$jsonResponse) {
            abort(500, 'Error retrieving data from Canvas.');
        }

        $body = null;
        $splitArray = explode("\r\n\r\n", $jsonResponse, 2); //assigns header and body to the right portions of the response
        if (!array_key_exists(1, $splitArray)) {
            abort(500, 'No response returned from Canvas.');
        }
        $body = $splitArray[1];

        $responseBody = json_decode($body, true);

        return $responseBody;
    }

    /**
    * Get an RSA key (either public or private) that we previously generated for our app on setup
    * from the .env file in order to send JWTs to Canvas (such as retrieving oauth token or deep linking)
    *
    * @param  string $envVar
    * @return string
    */

    private function getRsaKeyFromEnv($envVar) {
        $initialValue = env($envVar);
        $parsedValue = str_replace('\n', '', $initialValue);
        return $parsedValue;
    }

    /**
    * Determine if response in grade read/passback is due to invalid assignment,
    * which doesn't require error logging
    *
    * @param  string $response
    * @return boolean
    */

    private function isAssignmentInvalid($response)
    {
        $message = 'Assignment is invalid';
        if (strpos($response, $message) !== false) {
            return true;
        }

        return false;
    }

    /**
    * Determine if grade read/passback error is due to unresponsive LMS,
    * which doesn't require error logging
    *
    * @param  string $response
    * @return boolean
    */
    private function isCanvasDown($response)
    {
        if (strpos($response, 'Gateway Time-out')) {
            return true;
        }

        return false;
    }

    /**
    * Determine if response in grade read/passback is due to user not in course,
    * which doesn't require error logging
    *
    * @param  string $response
    * @return boolean
    */
    private function isUserNotInCourse($response)
    {
        $message = 'User is no longer in course';
        if (strpos($response, $message) !== false) {
            return true;
        }

        return false;
    }

    /**
    * Validate that the LTI launch type is 1.3
    *
    * @return void
    */

    private function validateMessage()
    {
        if ($this->launchValues['https://purl.imsglobal.org/spec/lti/claim/version'] !== "1.3.0") {
            abort(400, 'LTI launch failed: incorrect LTI version.');
        }

        if (!$this->launchValues['https://purl.imsglobal.org/spec/lti/claim/message_type']) {
            abort(400, 'LTI launch failed: no message type provided.');
        }
    }

    /**
    * Validate that the issuer in the JWT is Canvas and the audience is our app
    *
    * @return void
    */

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

    /**
    * Validate that the state and nonce in the launch JWT match our cached values to prevent unauthorized launches
    * (we created and cached these values before doing the OIDC redirect and should receive them back again after)
    *
    * @return void
    */

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