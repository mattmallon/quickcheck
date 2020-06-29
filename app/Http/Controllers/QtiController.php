<?php

use App\Classes\ExternalData\QTI as QTI;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;

class QtiController extends \BaseController
{

    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * If there is a critical error on import and the user still wants to save remaining quizzes
    *
    * @return Response
    */

    public function createImportedQuizzes(Request $request) {
        $qti = new QTI();
        $response = $qti->saveImportedQuizzes($request);
        return response()->success($response);
    }

    /**
    * Export selected quick checks into a QTI package
    *
    * @return Response (download, .zip file)
    */

    public function exportQTI(Request $request) {
        //NOTE: assuming that on the front-end, only non-custom-assessments were selectable
        $qti = new QTI();
        $downloadLocation = $qti->exportQTI($request);
        if ($downloadLocation) {
            return Response::download($downloadLocation);
        }
        else {
            return response()->error(400, ['There was an error exporting the QTI package.']);
        }
    }

    /**
    * Import uploaded QTI file and convert to quick checks
    *
    * @return Response
    */

    public function importQTI(Request $request) {
        $zipName = 'importFile';
        if ($request->file($zipName)->getClientOriginalExtension() === 'zip') {
            $zipFile = $request->file($zipName);
            $qti = new QTI();
            $response = $qti->importQTI($request, $zipFile);
            return response()->success($response);
        }
        else {
            return response()->error(400, ['reason' => 'Uploaded file was not a .zip file']);
        }
    }
}
