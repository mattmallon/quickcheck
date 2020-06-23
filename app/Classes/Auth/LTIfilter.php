<?php

namespace App\Classes\Auth;
use App;
use App\Models\User;
use App\Classes\LTI\LtiContext;

class LTIFilter {

    private $request;

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    public function __construct($request) {
        $this->request = $request;
    }

    /**
    * For the manage view/home page when accessing from left nav; could be either student or instructor
    *
    * @return boolean
    */

    public function manageFilter()
    {
        $context = new LtiContext;
        $context->initContext($this->request);
        //add decoded LTI launch values to request so they can be retrieved in the controller, etc.
        $this->request->merge(['ltiLaunchValues' => $context->getLaunchValues()]);

        return false;
    }
}
