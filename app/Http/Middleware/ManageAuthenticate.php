<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\Guard;
use App\Classes\Auth\LTIFilter;
use Session;

class ManageAuthenticate {
    public function handle($request, Closure $next)
    {
        $redirectUrl = false;

        //LTI POST launch
        //TODO: do we always prioritize this? The else if below for session otherwise is not going to be reached
        //unless I switch the order around.
        if ($request->isMethod('post')) {
            $ltiFilter = new LTIFilter($request);
            $redirectUrl = $ltiFilter->manageFilter();
        }
        //student or instructor has been authorized already in LTI post launch
        else if (Session::has('user') || Session::has('student')) {
            //let 'em go on by, nothing to do here
        }
        //not an LTI launch and no existing session -- either an intruder, or more likely, the session simply expired
        else {
            if ($request->is('api/*')) { //if an API request, send JSON error message
                $redirectUrl = 'api/sessionnotvalid';
            }
            else { //if a page view, redirect to error page
                $redirectUrl = 'sessionnotvalid';
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
