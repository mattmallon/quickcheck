<?php

use Illuminate\Http\Request;
use App\Classes\LTI\LtiContext;
use App\Classes\ExternalData\CanvasAPI;
use App\Models\Assessment;
use App\Models\AssessmentGroup;
use App\Models\Attempt;
use App\Models\Collection;
use App\Models\User;
use App\Models\CustomActivity;
use App\Models\Question;
use Illuminate\Support\Facades\Cache;

class AssessmentController extends \BaseController
{

    /************************************************************************/
    /* VIEW ENDPOINTS *******************************************************/
    /************************************************************************/

    /**
    * Show the view for editing the assessment.
    *
    * @param  int  $id
    * @return View
    */

    public function edit($id)
    {
        return displaySPA();
    }

    /**
    * GET request for an assessment (outside of LTI).
    *
    * @param  int  $id
    * @return View
    */

    public function show(Request $request, $id = null)
    {
        //Due to the way external tools (LTI) work in Canvas, we need to put the assessment_id in
        //the query string instead of in a route parameter. Although this function is not intended
        //to be used in an LTI context, it doesn't hurt to make it flexible in case we need to
        //copy and paste the LTI external tool URL into a separate window to debug, without having
        //to worry about changing up the link.
        $assessmentId = null;
        if ($id) { //when the id is included as a route param (outside of Canvas/LTI)
            $assessmentId = $id;
        }
        else if ($request->has("id")) { //when the URL is attained from the external tool link
            $assessmentId = intval($request->input("id"));
        }
        else { //abort if no ID found in either route param or query param
            return response()->error(400, ['Assessment ID is missing from url query string.']);
        }

        $assessment = Assessment::findOrFail($assessmentId);
        if ($request->has('attemptId')) {
            if ($assessment->custom_activity_id) {
                return $this->redirectToCustomActivity($assessment, $request);
            }

            return displaySPA();
        }

        //generate new attempt
        $attempt = new Attempt;
        $attempt->initAttempt($assessmentId, $request);

        //redirect to include attempt ID in query string
        $redirectPath = $request->fullUrl();
        $redirectPath .= ('&attemptId=' . $attempt->id);

        return redirect($redirectPath);
    }

    /**
    * Display the assessment and create LTI context when receiving LTI POST variables.
    *
    * @param  int  $id
    * @return Response
    */

    public function showLTI(Request $request)
    {
        //Due to the way external tools (LTI) work in Canvas, we need to put the assessment_id in
        //the query string instead of in a route parameter.
        $assessmentId = null;
        if ($request->has("id")) { //when the URL is attained from the external tool link
            $assessmentId = intval($request->input("id"));
        }
        else { //abort if no ID found in either route param or query param
            return response()->error(400, ['Assessment ID is missing from url query string.']);
        }

        //add attempt ID and nonce to query string after generating new attempt, then allow on once we have it
        $assessment = Assessment::findOrFail($assessmentId);
        if ($request->has('attemptId') && $request->has('nonce')) {
            if ($assessment->custom_activity_id) {
                return $this->redirectToCustomActivity($assessment, $request, );
            }

            return displaySPA();
        }

        $ltiContext = new LtiContext();
        $ltiContext->initContext($request);

        //generate new attempt
        $attempt = new Attempt;
        $attempt->initAttempt($assessmentId, $request, $ltiContext);

        //cache nonce and attempt ID to verify authenticity of new attempt if user does not have an API token this session
        $nonce = $attempt->getNonce();
        $attemptId = $attempt->id;
        Cache::put($nonce, $attemptId, now()->addMinutes(5));

        //redirect to include attempt ID and nonce in query string for API token authentication
        $redirectPath = $request->fullUrl();
        $redirectPath .= ('&attemptId=' . $attemptId);
        $redirectPath .= ('&nonce=' . $nonce);

        return redirect($redirectPath);
    }

    /************************************************************************/
    /* API ENDPOINTS ********************************************************/
    /************************************************************************/

    /**
    * Create a copy of an assessment
    *
    * @param  int  $id
    * @return Response
    */

    public function copy(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'assessment_group_id' => 'required',
            'assessment_name' => 'required'
        ]);

        if ($validator->fails()) {
            return response()->error(400, 'Please select a set, subset, and name.');
        }

        $assessment = new Assessment();
        $assessmentGroupId = $request->assessment_group_id;
        $name = $request->assessment_name;
        $copiedAssessment = $assessment->copy($id, $assessmentGroupId, $name);

        return response()->success(['assessment' => $copiedAssessment->toArray()]);
    }

    /**
    * Delete from the database
    *
    * @param  int  $id
    * @return Response
    */

    public function destroy($id)
    {
        $assessment = Assessment::findOrFail($id);
        if (!$assessment->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $assessment->delete();
        return response()->success();
    }

    /**
    * Get all relevant data for editing an assessment
    *
    * @param  int  $id
    * @return Response
    */

    public function getAssessment($id)
    {
        $assessment = Assessment::findOrFail($id);
        $collection = $assessment->assessmentGroup->collection;
        $assessmentGroups = $collection->assessmentGroups;
        $customActivity = $assessment->customActivity;
        $noAnswers = false;
        $questionModel = new Question;
        $questions = $questionModel->getAssessmentQuestions($id, $noAnswers);
        if ($customActivity) { //exception called when toArray() called on NULL, so check first
            $customActivity = $customActivity->toArray();
        }

        if (!$assessment->canUserRead($request->user)) {
            return response()->error(403);
        }
        return response()->success([
            'assessment' => $assessment->toArray(),
            'questions' => $questions->toArray(),
            'collection' => $collection->toArray(),
            'assessmentGroups' => $assessmentGroups->toArray(),
            'customActivity' => $customActivity
        ]);
    }

    /**
    * Get all questions in an assessment
    *
    * @param  int  $id
    * @return Response
    */

    public function getAssessmentQuestions($id)
    {
        $noAnswers = true;
        $questionModel = new Question;
        $questions = $questionModel->getAssessmentQuestions($id, $noAnswers);

        $assessment = Assessment::findOrFail($id);
        $shuffled = $assessment->shuffled;
        return response()->success([
            'title' => $assessment->title,
            'description' => $assessment->description,
            'questions' => $questions,
            'shuffled' => $shuffled
        ]);
    }

    /**
    * Upload an image to be embedded in an assessment.
    *
    * @param  file tmp_name
    * @return Response
    */

    public function imageUpload(Request $request) {
        $validator = Validator::make($request->all(), [
            'file' => 'required|image',
        ]);
        if ($validator->fails()) {
            return response()->error(400, ['Image file not included.']);
        }

        $fileDriver = env('IMAGE_UPLOAD_FILE_DRIVER', 'local');
        $path = null;

        //for local file system, build absolute path; otherwise, if using S3, we should already have it
        if ($fileDriver === 'local') {
            $path = $request->file->store('public/images', $fileDriver);
            $path = str_replace('public', 'storage', $path); //change to public symlink path rather than internal path
            $path = env('APP_URL') . '/' . $path;
        }
        else if ($fileDriver === 's3') {
            $path = $request->file->store('uploads', $fileDriver);
            $path = 'https://' . env('S3_BUCKET') . '.s3.' . env('S3_REGION') . '.amazonaws.com/' . $path;
        }

        //tinymce expects response in specific format, giving url of file location, can't
        //use our typical success() response macro because it's not in the same format
        return response()->json(['location' => $path]);
    }

    /**
    * Store a new assessment.
    *
    * @param  string  name
    * @param  int  assessment_group_id
    * @return Response
    */

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required',
            'assessment_group_id' => 'required'
        ]);
        if ($validator->fails()) {
            return response()->error(400, ['Assessment name and group ID required.']);
        }

        $assessmentGroup = AssessmentGroup::findOrFail($request->assessment_group_id);
        if (!$assessmentGroup->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $assessment = Assessment::create([
            'name' => $request->name,
            'assessment_group_id' => $request->assessment_group_id
        ]);
        return response()->success(['assessment' => $assessment->toArray()]);
    }

    /**
    * Update the assessment.
    *
    * @param  int  $id
    * @return Response
    */

    public function update(Request $request, $id)
    {
        $assessment = Assessment::findOrFail($id);
        if (!$assessment->canUserWrite($request->user)) {
            return response()->error(403);
        }

        $updatedAssessmentData = $request->assessment;
        $assessment->updateAssessment($updatedAssessmentData);

        if (array_key_exists('questions', $updatedAssessmentData)) {
            foreach ($updatedAssessmentData['questions'] as $updatedQuestion) {
                $question = new Question;
                $question->saveQuestion($assessment, $updatedQuestion);
            }
        }

        if (array_key_exists(('deletedQuestions'), $updatedAssessmentData)) {
            foreach ($updatedAssessmentData['deletedQuestions'] as $deletedQuestion) {
                Question::destroy($deletedQuestion['id']);
            }
        }

        return response()->success();
    }

    /************************************************************************/
    /* PRIVATE FUNCTIONS ****************************************************/
    /************************************************************************/

    /**
    * Get the link to a custom activity and redirect on the assessment launch.
    *
    * @param  Assessment  $assessment
    * @return Response
    */

    private function redirectToCustomActivity($assessment, $request)
    {
        $customActivity = CustomActivity::findOrFail($assessment->custom_activity_id);
        //in the redirect url, include the assessment id as a query param, so an attempt can be initialized
        $redirectUrl = $customActivity->getRedirectUrl($request, $assessment->id);
        $attemptId = $request->get('attemptId');
        $nonce = $request->get('nonce');

        $redirectUrl .= ('&attemptId=' . $attemptId);
        if ($nonce) {
            $redirectUrl .= ('$nonce=' . $nonce);
        }

        return redirect($redirectUrl);
    }
}
