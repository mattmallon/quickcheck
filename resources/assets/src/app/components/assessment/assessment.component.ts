import { Component, OnInit } from '@angular/core';
import { UtilitiesService } from '../../services/utilities.service';
import { AssessmentService } from '../../services/assessment.service';
import { AuthService } from '../../services/auth.service';
import { CaliperService } from '../../services/caliper.service';
import { UserService } from '../../services/user.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { CompletionModalComponent } from './completion-modal/completion-modal.component';
import { ErrorModalComponent } from './error-modal/error-modal.component';
import { FeedbackModalComponent } from './feedback-modal/feedback-modal.component';
import { TimeoutModalComponent } from './timeout-modal/timeout-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'qc-assessment',
  templateUrl: './assessment.component.html',
  styleUrls: ['./assessment.component.scss']
})
export class AssessmentComponent implements OnInit {
  bsModalRef: BsModalRef;
  answerSelected = false;
  apiToken = null;
  assessmentId = '';
  assessmentTitle = null;
  assessmentDescription = null;
  attemptId = null;
  caliper = null;
  complete = false;
  countCorrect = 0;
  countIncorrect = 0;
  currentQuestion = null;
  currentQuestionIndex = 0;
  errorMessage = false;
  feedback = [];
  incorrectRows = null; //matrix and matching only
  isCorrect = false;
  isNextBtnDisabled = false; //have to be careful to prevent double clicking next btn
  modalVisible = false; //for accessibility purposes, hide main when modal is visible
  nonce = null; //nonce passed to front-end on LTI launch for verification
  questions = null;
  partialCredit = false;
  pointsPossible = 0;
  preview = false; //if preview query param in URL, send to server, valid LTI session not needed
  score = 0;
  studentAnswer = null;
  timeoutSecondsRemaining = null; //seconds of timeout remaining, if feature enabled

  constructor(
    public utilitiesService: UtilitiesService,
    private assessmentService: AssessmentService,
    private authService: AuthService,
    private caliperService: CaliperService,
    private modalService: BsModalService,
    private userService: UserService
  )
  {
    //subscribe to changes in feedback modal
    this.modalService.onHide.subscribe(() => { this.nextQuestion() });

    this.apiToken = this.authService.getStudentTokenFromStorage();
    this.assessmentService.setApiToken(this.apiToken);
  }

  async ngOnInit() {
    this.getAssessmentIdFromUrl();
    this.preview = this.isPreview();
    this.attemptId = this.utilitiesService.getQueryParam('attemptId');
    this.nonce = this.utilitiesService.getQueryParam('nonce');

    let data;

    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.assessmentService.initAttempt(this.assessmentId, this.preview.toString(), this.attemptId, this.nonce);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      const serverError = this.utilitiesService.getQuizError(error);
      const errorMessage = serverError ? serverError : 'Error initializing attempt.';
      this.showErrorModal(errorMessage);
      this.utilitiesService.loadingFinished();
      return;
    }

    //if student is restarting the QC, we might be receiving a new attempt ID
    this.attemptId = data.attemptId;
    this.parseCaliperData(data);
    this.parseTimeoutData(data);

    //if API token present, this is our first attempt of the session and authentication was valid
    const apiToken = data.apiToken;
    if (apiToken) {
      this.authService.storeStudentToken(apiToken);
      this.apiToken = apiToken;
      this.assessmentService.setApiToken(this.apiToken);
    }

    this.utilitiesService.loadingFinished();
    await this.initQuestions();
  }

  //get the assessment id from the Laravel url, /assessment/{id} and separate from query strings at the end, if necessary;
  //OR if in LTI and using query string /assessment?id=, then grab that
  getAssessmentIdFromUrl() {
    let assessmentId;
    const queryParamId = this.utilitiesService.getAssessmentIdFromQueryParams();

    if (queryParamId) {
      assessmentId = queryParamId;
    }
    else {
      var splitUrl = window.location.href.split('/'),
        lastParam = splitUrl[splitUrl.length - 1],
        splitQuery = lastParam.split('?'); //even if no query string, returns a single string in array for us to grab
      assessmentId = splitQuery[0];
    }

    this.assessmentId = assessmentId;
  }

  getAttempt() {
    var complete = '0',
      lastMilestone = 'question phase';

    if (this.currentQuestionIndex == this.questions.length - 1) {
      complete = '1';
      lastMilestone = 'complete';
    }

    return {
      'id': this.attemptId,
      'last_milestone': lastMilestone,
      'complete': complete,
    };
  }

  async initQuestions() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.assessmentService.getQuestions(this.assessmentId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      const serverError = this.utilitiesService.getQuizError(error);
      const errorMessage = serverError ? serverError : 'Error retrieving questions.';
      this.showErrorModal(errorMessage);
      this.utilitiesService.loadingFinished();
      return;
    }

    this.assessmentTitle = data.title;
    this.assessmentDescription = data.description;
    this.questions = data.questions;
    this.shuffleAnswerOptions();
    if (data.shuffled == 'true') {
      this.shuffleQuestions();
    }
    this.pointsPossible = this.questions.length;
    this.currentQuestion = this.questions[this.currentQuestionIndex];
    this.utilitiesService.setTitle('Quick Check');
    this.utilitiesService.loadingFinished();
  }

  isComplete() {
    if (this.countCorrect + this.countIncorrect === this.questions.length) {
      return true;
    }

    return false;
  }

  isPreview() {
    const isPreview = this.utilitiesService.getAssessmentPreviewFromQueryParams();

    if (isPreview) {
      return true;
    }

    return false;
  }

  isQuestionType(questionType) {
    if (this.currentQuestion.question_type == questionType) {
      return true;
    }

    return false;
  }

  isRowFeedbackShown() {
    if (this.isQuestionType('matrix') || this.isQuestionType('matching')) {
      return true;
    }

    return false;
  }

  isSubmitDisabled() {
    if (!this.answerSelected || this.incorrectRows || this.utilitiesService.loading) {
      return true;
    }

    return false;
  }

  nextQuestion() {
    this.isNextBtnDisabled = true; //disable next button to prevent double clicking (skips a question)
    this.modalVisible = false;
    this.currentQuestionIndex++;

    if (this.isComplete()) {
      this.onCompletion();
      return;
    }

    this.resetQuestionVariables();
    this.currentQuestion = this.questions[this.currentQuestionIndex];
    this.utilitiesService.setLtiHeight();
    //focus to question number and change title for accessibility
    this.utilitiesService.focusToElement('.qc-question-number');
    //update title for accessibility
    this.utilitiesService.setTitle('Quick Check - Question ' + (this.currentQuestionIndex + 1) + ' out of ' + this.pointsPossible);
  }

  onAnswerSelection($event) {
    this.studentAnswer = $event.studentAnswer;
    this.studentAnswer.questionType = this.currentQuestion.question_type;
    if ($event.answerComplete) {
      this.answerSelected = true;
    }
    //make sure if student un-selects an answer, to revert
    else {
      this.answerSelected = false;
    }
  }

  onCompletion() {
    const initialState = {
      attemptId: this.attemptId,
      complete: this.complete,
      pointsPossible: this.pointsPossible,
      score: this.score
    };
    this.modalService.show(CompletionModalComponent, {initialState, backdrop: 'static', keyboard: false});
    this.modalVisible = true;
    this.utilitiesService.focusToElement('#qc-completion-modal');
  }

  parseCaliperData(data) {
    var caliperData = data.caliper;

    if (!caliperData) {
      return false;
    }

    this.caliperService.init(caliperData);

    if (!this.caliperService.isEnabled()) {
      return false;
    }

    this.caliperService.forwardEvent(caliperData);
  }

  parseTimeoutData(data) {
    if (!data.timeoutRemaining || data.timeoutRemaining <= 0) {
      return;
    }

    this.showTimeoutModal(data.timeoutRemaining);
  }

  resetQuestionVariables() {
    this.currentQuestion = null;
    this.studentAnswer = null;
    this.answerSelected = false;
    this.isCorrect = false;
    this.incorrectRows = null;
    this.partialCredit = false;
  }

  restart() {
    //hard page refresh to ensure a new attempt is created
    window.location.reload();
  }

  showErrorModal(errorMessage, showRestartBtn = true) {
    this.errorMessage = errorMessage;
    const initialState = {
      errorMessage: this.errorMessage,
      showRestartBtn
    };
    this.modalService.show(ErrorModalComponent, {initialState, backdrop: 'static', keyboard: false});
    this.modalVisible = true;
  }

  showFeedback(data) {
    this.feedback = data.feedback;
    this.isNextBtnDisabled = false; //un-disable next button (disabled in component to prevent double clicking)
    //show modal feedback for all questions except for matrix and matching, which gives incorrect rows in table
    //also, matrix and matching assign partial credit
    if (this.isRowFeedbackShown()) {
      this.incorrectRows = data.incorrectRows;
      this.utilitiesService.focusToElement('.qc-row-feedback');
    }
    else {
      const initialState = {
        feedback: this.feedback,
        isCorrect: this.isCorrect,
        isNextBtnDisabled: this.isNextBtnDisabled
      };
      this.modalService.show(FeedbackModalComponent, {initialState, backdrop: 'static', keyboard: false});
      this.modalVisible = true;
      this.utilitiesService.formatMath(); //if equations are shown in the feedback
      this.utilitiesService.focusToElement('#qc-feedback-modal');
    }
  }

  showTimeoutModal(timeoutSecondsRemaining) {
    this.timeoutSecondsRemaining = timeoutSecondsRemaining;
    const initialState = {
      timeoutSecondsRemaining: this.timeoutSecondsRemaining
    };
    this.modalService.show(TimeoutModalComponent, {initialState, backdrop: 'static', keyboard: false});
    this.modalVisible = true;
  }

  //if any of the questions have random order for the answer options, then shuffle them
  shuffleAnswerOptions() {
    for (let question of this.questions) {
      if (question.randomized == 'true' && question.options) {
        this.utilitiesService.shuffle(question.options);
      }
    }
  }

  //shuffle question order
  shuffleQuestions() {
    this.utilitiesService.shuffle(this.questions);
  }

  async submitAnswer() {
    let data;
    this.utilitiesService.loadingStarted(); //do this right away to prevent super fast double clicks
    var submission = {
      studentAnswer: this.studentAnswer,
      attempt: this.getAttempt()
    };

    try {
      const resp = await this.assessmentService.submitQuestion(this.currentQuestion.id, submission);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      const serverError = this.utilitiesService.getQuizError(error);
      const errorMessage = serverError ? serverError : 'Error submitting answer.';
      this.showErrorModal(errorMessage);
      this.utilitiesService.loadingFinished();
      return;
    }

    this.isCorrect = data.isCorrect;
    this.updateScore(data);
    this.showFeedback(data);
    this.utilitiesService.loadingFinished();
    this.parseCaliperData(data);
    if (this.isComplete()) {
      this.complete = true;
    }
  }

  updateScore(data) {
    if (this.isCorrect) {
      this.countCorrect++;
      this.score += 1;
      return;
    }

    this.countIncorrect++;
    if (data.credit) {
      var newScore = (this.score + data.credit).toFixed(2);
      this.score = +(newScore);
      this.partialCredit = true;
    }
  }

}
