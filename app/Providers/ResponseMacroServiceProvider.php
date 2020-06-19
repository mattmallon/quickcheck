<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Response;
use App\Classes\XML;

class ResponseMacroServiceProvider extends ServiceProvider {

    /**
    * Register response macros
    * To make the JSON API more consistent, make sure success/errors return the same each time
    * Inspired by: https://blog.jadjoubran.io/2016/03/27/laravel-response-macros-api/
    *
    * @return Response->json
    */
    public function boot() {
        Response::macro('success', function($data = []) {
            return Response::json([
                'success' => true,
                'data' => $data
            ]);
        });

        Response::macro('error', function($status = 400, $errorList = [], $data = null) {
            //cannot access properties on $this, so need to define these here
            $errorReasons = [
                '400' => 'The data in your request was not properly formatted.',
                '403' => 'You do not have appropriate permissions for this action.',
                '500' => 'There was an error processing your request.'
            ];

            if (!$errorList) {
                $statusKey = (string) $status;
                $errorList[] = $errorReasons[$statusKey];
            }

            return Response::json([
                'error' => true,
                'errorList' => $errorList,
                'data' => $data
            ], $status);
        });
    }

    /**
    * Register any application services.
    *
    * @return void
    */
    public function register()
    {
        //none
    }
}