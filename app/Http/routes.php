<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the Closure to execute when that URI is requested.
|
*/

/********************************************************************/
/****** PUBLIC VIEWS ************************************************/
/********************************************************************/

//taking an assessment
Route::get('assessment/{id?}', 'AssessmentController@show'); //option to include id as query param instead of in route
Route::post('assessment/', 'AssessmentController@showLTI'); //id included as query param for LTI tool

//LTI config
Route::get('lticonfig', 'HomeController@returnLtiConfig');
Route::post('logininitiations', 'HomeController@initializeOIDC');
Route::post('canvasauthredirect', 'HomeController@authRedirect');

//errors
Route::get('usernotfound', 'UserController@userNotFound');
Route::get('sessionnotvalid', 'UserController@sessionNotValid');
Route::get('ltisessionnotvalid', 'UserController@ltiSessionNotValid');

//documentation
Route::get('documentation', function() {
    return View::make('documentation');
});

/********************************************************************/
/****** PUBLIC API **************************************************/
/********************************************************************/

Route::group(['prefix' => 'api'], function() {
    //Initializing an attempt
    Route::post('attempt/{assessmentId}', 'AttemptController@initAttempt');

    //Quiz-taking
    Route::get('assessment/{id}/questions', 'AssessmentController@getAssessmentQuestions');
    Route::post('question/{id}/submit', 'QuestionController@submit');

    //Custom activities
    Route::post('attempt/update/{id}', 'AttemptController@updateAttempt');
    Route::post('response/{id}', 'StudentResponseController@insertResponse');

    //Grade passback (requires existing attempt in the database)
    Route::post('grade/passback', 'GradeController@passback');

    //API error for instructors with an expired session
    Route::get('sessionnotvalid', 'UserController@apiSessionNotValid');
});

/********************************************************************/
/****** MANAGE HOMEPAGE AND STUDENT VIEW ****************************/
/********************************************************************/

Route::group(['middleware' => ['manageAuth']], function() {
    //views
    Route::post('home', 'HomeController@home'); //LTI manage launch URL
    Route::get('student', 'ReleaseController@contextReleaseIndex'); //student home page (redirected from home)

    //student api endpoints
    Route::group(array('prefix' => 'api'), function() {
        Route::get('assessment/{id}/attempt/{context_id}', 'AttemptController@getStudentAssessmentAttempts');
        Route::get('release/{context_id}', 'ReleaseController@getReleasedAssessments');
    });
});

/********************************************************************/
/****** INSTRUCTOR VIEWS ********************************************/
/********************************************************************/

Route::group(array('middleware' => array('auth')), function() {

    //assessment views
    Route::get('assessment/{id}/edit', 'AssessmentController@edit');

    //collection views
    Route::get('collection', 'CollectionController@indexView');
    Route::get('collection/{id}', 'CollectionController@show');

    //CSV downloads
    Route::get('attempts/csv/download/{context_id}/{student_id?}', 'CSVController@exportCourseAttempts');
    Route::get('attempts/csv/download/context/{context_id}/assessment/{assessment_id}', 'CSVController@exportAssessmentAttempts');
    Route::get('responses/csv/download/assessment/{assessment_id}/context/{context_id}', 'CSVController@exportAssessmentResponses');
    Route::get('users/csv/groups/course/{courseId}', 'CSVController@getUsersInGroups');

    //home page
    Route::get('home', 'HomeController@home');
    Route::get('/', 'HomeController@home');

    //manage views
    //instructor manage view to see overview of student results; includes query param for LTI context ID
    Route::get('manage', 'AttemptController@manageOverview');
    //instructor manage view to see attempts for a specific assessment in an LTI context
    Route::get('assessment/{id}/attempts', 'AttemptController@manageAttempts');
    //instructor manage view to see attempts for a specific student in an LTI context
    Route::get('student/{studentId}/attempts', 'AttemptController@viewAttemptsForStudent');

    //QTI downloads
    Route::post('exportQTI', 'QtiController@exportQTI');

    //select an LTI link in Canvas
    Route::post('select', 'CollectionController@selectLink');

    /********************************************************************/
    /****** INSTRUCTOR API **********************************************/
    /********************************************************************/

    Route::group(array('prefix' => 'api'), function() {

        //assessment endpoints
        Route::get('assessment/{id}', 'AssessmentController@getAssessment');
        Route::put('assessment/{id}', 'AssessmentController@update');
        Route::delete('assessment/{id}', 'AssessmentController@destroy');
        Route::post('assessment', 'AssessmentController@store');
        Route::post('assessment/{id}/copy', 'AssessmentController@copy');

        //assessment group endpoints
        Route::post('assessmentgroup', 'AssessmentGroupController@store');
        Route::put('assessmentgroups/{id}', 'AssessmentGroupController@update');
        Route::delete('assessmentgroups/{id}', 'AssessmentGroupController@destroy');

        //collection endpoints
        Route::get('collection/{id}', 'CollectionController@getCollection');
        Route::get('collections/{assessments?}', 'CollectionController@index');
        Route::get('user/collection/{id}', 'CollectionController@getUserPermissions');
        Route::post('collection', 'CollectionController@store');
        Route::put('collection/{id}', 'CollectionController@update');
        Route::delete('collection/{id}', 'CollectionController@destroy');
        Route::post('quickadd', 'CollectionController@quickAdd');
        Route::post('collection/{id}/search', 'CollectionController@search');

        //public collection endpoints
        Route::get('publiccollections', 'CollectionController@publicIndex');
        Route::put('publiccollection/{collectionId}', 'CollectionController@publicToggle');

        //collection feature endpoints
        Route::get('features/collection/{collectionId}', 'CollectionFeatureController@getFeatures');
        Route::put('feature/{id}', 'CollectionFeatureController@update');

        //membership endpoints
        Route::get('memberships/{assessments?}', 'MembershipController@index');
        Route::post('membership', 'MembershipController@store');
        Route::get('membership/collection/{id}', 'MembershipController@getCollectionMembership');
        Route::put('membership/collection/{id}', 'MembershipController@updateCollectionMembership');

        //public collection membership endpoints
        Route::post('publicmembership/collection/{collectionId}', 'PublicMembershipController@store');
        Route::delete('publicmembership/collection/{collectionId}', 'PublicMembershipController@destroy');

        //custom activity endpoints
        Route::get('customActivities', 'CustomActivityController@index');
        Route::post('customActivity', 'CustomActivityController@store');
        Route::put('customActivity/{id}', 'CustomActivityController@update');
        Route::delete('customActivity/{id}', 'CustomActivityController@destroy');

        //grade endpoints
        Route::get('assessment/{id}/attempts/{context_id}/submissions', 'GradeController@index');
        Route::get('assessment/{assessmentId}/attempts/{contextId}/submission/{studentId}', 'GradeController@show');
        Route::post('attempts/gradepassback', 'GradeController@store');
        Route::post('attempts/autograde', 'GradeController@autoGrade');

        //QTI endpoints
        Route::post('importQTI', 'QtiController@importQTI');
        Route::post('createImportedQuizzes', 'QtiController@createImportedQuizzes');

        //release endpoints
        Route::post('release', 'ReleaseController@createRelease');
        Route::delete('release/{id}', 'ReleaseController@rollbackRelease');

        //results endpoints
        Route::get('attempts/{id}', 'AttemptController@getAttemptsForContext');
        Route::get('assessment/{id}/attempts/{context_id}', 'AttemptController@getAttemptsForAssessment');
        Route::get('attempt/{id}/responses', 'StudentResponseController@getAttemptResponses');
        Route::get('responses/analytics/assessment/{id}/context/{context_id}', 'StudentResponseController@calculateAnalytics');
        Route::get('attempts/{contextId}/student/{studentId}', 'AttemptController@getAttemptsForStudentInCourse');
        Route::get('analytics/context/{contextId}/student/{studentId}', 'StudentController@calculateStudentAnalytics');

        //student endpoints
        Route::get('students/context/{contextId}', 'StudentController@getStudentsByContext');

        //user endpoints
        Route::get('user', 'UserController@show');
        Route::get('user', 'UserController@show');
        Route::post('user/addAdmin', 'UserController@addAdmin');
        Route::post('user/validate', 'UserController@validateUser');
        Route::get('users/course/{id}', 'UserController@getUsersInCourse');
    });
});