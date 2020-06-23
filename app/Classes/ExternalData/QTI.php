<?php

namespace App\Classes\ExternalData;

class QTI
{
    /**
    * Master function to export a QTI zip package, accessed publicly by controller.
    * Will return a response containing .zip file for download
    *
    * @param  Request  $request
    * @return Zip
    */

    public function exportQTI(Request $request)
    {
        $exportQTI = new ExportQTI();
        $zip = $exportQTI->export($input);
        return $zip;
    }

    /**
    * Master function to import a QTI zip package, accessed publicly by controller.
    * Will return a response containing potential warnings and imported quizzes.
    *
    * @param  Request $request
    * @param  File    $zipFile
    * @return []      $response
    */

    public function importQTI($request, $zipFile)
    {
        $importQTI = new ImportQTI();
        $response = $importQTI->import($request, $zipFile);
        return $response;
    }

    /**
    * If an import critical error was previously returned, and the user decides to go ahead and
    * save the quizzes that were successful, then this endpoint is hit to save them.
    *
    * @param  []  $input
    * @return []  $response
    */

    //if critical warnings issued in import process, the user can choose whether or not to save the quizzes that DID import correctly
    public function saveQuizzes($request)
    {
        $input = $request->all();
        $importQTI = new ImportQti();
        $response = $importQTI->saveQuizzes($input['quizzes']);
        return $response;
    }
}