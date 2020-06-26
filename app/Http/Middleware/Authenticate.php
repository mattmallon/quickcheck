<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\Guard;
use App\Classes\Auth\CASFilter;
use App\Classes\Auth\AltCASFilter;
use App\Classes\Auth\LTIFilter;
use App\Models\User;

class Authenticate {
    public function handle($request, Closure $next)
    {
        $redirectUrl = false;
        $apiToken = $request->bearerToken();
        //TODO: also check for API token in request POST params, as may be the case for CSV and QTI downloads,
        //where we are making a browser request to the page rather than an API call in order to stream download.

        //give priority to LTI authentication
        if ($request->input('id_token')) { //LTI 1.3 launch with JWT token
            $ltiFilter = new LTIFilter($request);
            $redirectUrl = $ltiFilter->manageFilter();
        }
        //authenticated instructor passing API token in request
        else if ($apiToken) {
            //if the user's local storage value has expired;
            //the bearerToken() function of Laravel will return null as string rather than primitive
            if ($apiToken == 'null') {
                return $this->returnError();
            }

            $user = User::findByApiToken($apiToken); //will fail if user not found
            $request->merge(['user' => $user]);
        }
        else {
            return $this->returnError();
        }

        if ($redirectUrl) {
            return redirect($redirectUrl);
        }
        else {
            return $next($request);
        }
    }

    private function returnError()
    {
        //if not an LTI launch and no API token in request, then unauthorized.
        //most likely due to their API token expiring in local storage.
        //send CAS redirect URL to home page if at IU. The front-end will redirect
        //via CAS if the user is not in an iframe, otherwise user refreshes Canvas.
        $errorData = [];
        $casFilter = new CASfilter;
        if ($casFilter->casEnabled()) {
            $errorData['casRedirectUrl'] = $casFilter->getRedirectUrl();
        }

        return response()->error(403, ['Your session has expired. Please refresh the page.'], $errorData);
    }
}
