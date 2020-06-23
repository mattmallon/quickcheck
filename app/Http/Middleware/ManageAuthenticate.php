<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\Guard;
use App\Classes\Auth\LTIFilter;
use App\Models\Student;

class ManageAuthenticate {
    public function handle($request, Closure $next)
    {
        $redirectUrl = false;
        $apiToken = $request->bearerToken();

        //LTI POST launch
        if ($request->isMethod('post')) {
            $ltiFilter = new LTIFilter($request);
            $redirectUrl = $ltiFilter->manageFilter();
        }
        //authenticated student passing in API token
        else if ($apiToken) {
            //TODO: can this accept an object or does it have to be an array/basic value?
            $student = Student::findByApiToken($apiToken);
            $request->merge(['student' => $student]);
        }
        //not an LTI launch and no API token -- either an intruder, or more likely, the session simply expired
        else {
            if ($request->is('api/*')) { //if an API request, send JSON error message
                return response()->error(403, ['User not authenticated.']);
            }
            else { //if a page view, redirect to error page
                $redirectUrl = 'error';
            }
        }

        if ($redirectUrl) {
            return redirect($redirectUrl);
        }
        else {
            return $next($request);
        }
    }
}
