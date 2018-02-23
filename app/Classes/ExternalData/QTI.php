<?php

namespace App\Classes\ExternalData;

class QTI
{
    /**
    * Master function to export a QTI zip package, accessed publicly by controller.
    * Will return a response containing .zip file for download
    *
    * @param  []  $input
    * @return Zip
    */

    public function exportQTI($input)
    {
        $exportQTI = new ExportQTI();
        $zip = $exportQTI->export($input);
        return $zip;
    }

    /**
    * Master function to import a QTI zip package, accessed publicly by controller.
    * Will return a response containing potential warnings and imported quizzes.
    *
    * @param  []  $input
    * @param  File  $zipFile
    * @return [] $response
    */

    public function importQTI($input, $zipFile)
    {
        $importQTI = new ImportQTI();
        $response = $importQTI->import($input, $zipFile);
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
    public function saveQuizzes($input)
    {
        $importQTI = new ImportQti();
        $response = $importQTI->saveQuizzes($input['quizzes']);
        return $response;
    }
}