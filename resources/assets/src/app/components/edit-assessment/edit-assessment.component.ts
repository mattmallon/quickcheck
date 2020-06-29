import { Component, OnInit, OnDestroy } from '@angular/core';
import { AssessmentEditService } from '../../services/assessment-edit.service';
import { CustomActivityService } from '../../services/custom-activity.service';
import { UserService } from '../../services/user.service';
import { UtilitiesService } from '../../services/utilities.service';
import * as cloneDeep from 'lodash/cloneDeep';
import { CanDeactivateGuard } from '../../guards/can-deactivate-guard.service';
import { AuthService } from '../../services/auth.service';

interface ComponentCanDeactivate {
  canDeactivate: () => boolean;
}

@Component({
  selector: 'qc-edit-assessment',
  templateUrl: './edit-assessment.component.html',
  styleUrls: ['./edit-assessment.component.scss']
})
export class EditAssessmentComponent implements OnInit, CanDeactivateGuard {
  admin = false;
  apiToken = null;
  assessment = null;
  assessmentGroups = null;
  assessmentId = null;
  collection = null;
  currentPage = 'sets';
  customActivity = null;
  customActivityAdded = false;
  edited = false;
  questions = null;
  readOnly = false;
  saved = true;
  user = null;
  validationError = false; //if validation errors, show a warning
  validationErrorList = [];

  constructor(
    public utilitiesService: UtilitiesService,
    public authService: AuthService,
    public customActivityService: CustomActivityService,
    private userService: UserService,
    private assessmentEditService: AssessmentEditService
  )
  {
    this.apiToken = this.authService.getInstructorTokenFromStorage();
    this.userService.setApiToken(this.apiToken);
    this.assessmentEditService.setApiToken(this.apiToken);
    this.customActivityService.setApiToken(this.apiToken);

    //Ask user if they really want to leave the page if unsaved changes
    window.addEventListener("beforeunload", (event) => {
      if (this.saved || this.readOnly) {
        //changes are saved, or user has read-only permissions and can't make changes,
        //so let the user head out the door
      }
      else {
        event.preventDefault();
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    });
  }

  async ngOnInit() {
    this.assessmentId = this.getAssessmentId();
    await this.init(); //this function gets called again after saving, so separate out
    this.saved = true; //don't confirm before user leaves until changes have been made
  }

  canDeactivate() {
    if (!this.saved && !this.readOnly) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return false;
      }
    }

    return true;
  }

  beforeUnload() {
      if (this.saved || this.readOnly) {
        //changes are saved, or user has read-only permissions and can't make changes,
        //so let the user head out the door
      }
      else {
        //browser should confirm to user that they want to leave the page
        return 'You have unsaved changes.';
      }
  }

  async init(assessmentSaved = false) {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.assessmentEditService.getAssessment(this.assessmentId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.initData(data);
    this.utilitiesService.loadingFinished();
    if (assessmentSaved) {
      this.saved = true;
      //scroll to bottom, to make sure success alert is visible (it was jumping around with focus)
      //$('html, body').animate({ scrollTop: $(document).height() }, 'slow');
      document.body.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest'});
      this.utilitiesService.focusToElement('#qc-save-success');
    }
  }

  initData(data) {
    this.assessment = data.assessment;
    this.questions = data.questions;
    this.collection = data.collection;
    this.assessmentGroups = data.assessmentGroups;
    this.customActivity = data.customActivity;
    if (this.customActivity) {
      this.customActivityAdded = true;
    }
    this.utilitiesService.setTitle('Edit Quick Check - ' + this.assessment.name);
    this.setModelIntegers();
    this.getUserAndPermissions(); //determine if user is an admin and permissions

    //a little clunky, but it was flat out impossible to get the LTI height correct
    //in chrome on initial page load; FF was fine, and Chrome works fine as soon as
    //anything is edited. Moving this to sub-components was not working.
    //so, wait for a few seconds, after components all load, then set the height.
    setTimeout(() => {
      this.utilitiesService.setLtiHeight();
    }, 3000, false);
  }

  addQuestion() {
    var question,
      questionOrder = this.getQuestionCount() + 1,
      tempId = questionOrder.toString() + '-temp';

    this.questions.push({
      'id': tempId,
      'question_order': questionOrder,
      'question_text': '',
      'question_type': 'multiple_choice',
      'randomized': 'true',
      'multiple_correct': 'false',
      'options': []
    });

    this.onEdited();
    question = this.questions[this.questions.length - 1];
    this.utilitiesService.setLtiHeight();
    this.focusToQuestion(question);
  }

  canViewCustomActivity() {
    if (this.admin || this.customActivityAdded) {
      return true;
    }

    return false;
  }

  focusToQuestion(question) {
    const questionId = '#question-header-' + question.question_order;
    this.utilitiesService.focusToElement(questionId);
  }

  getAssessmentId() {
    //get the assessment id from the Laravel url, /assessment/{id}/edit
    var splitUrl = window.location.href.split('/'),
      assessmentId = splitUrl[splitUrl.length - 2];

    return assessmentId;
  }

  getQuestionCount() {
    return this.questions.length;
  }

  async getUserAndPermissions() {
    //if we're reloading after a save, don't re-fetch this info
    if (this.user) {
      return;
    }

    let data;
    try {
      const resp = await this.userService.getUserAndPermissions(this.collection.id);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.user = data.user;
    this.readOnly = data.readOnly;
    if (this.user.admin == 'true') {
      this.admin = true;
    }
  }

  isQuestionAdded() {
    var questionFound = false;

    if (!this.questions) { //i.e., custom activity
      return false;
    }

    if (!this.questions.length) {
      return false;
    }

    return true;
  }

  onEdited() {
    this.edited = true; //only show "saved" success message if edits made
    this.saved = false; //indicate unsaved changes
    this.utilitiesService.setLtiHeight();
  }

  onQuestionDeleted($event) {
    var questionIndex = $event.questionIndex,
      question = this.questions[questionIndex];

    //only if the question had been previously saved, keep in a separate
    //array to send to back-end to delete; otherwise, just scrap it
    if (question.id.toString().indexOf('temp') === -1) {
      if (!this.assessment.deletedQuestions) {
        this.assessment.deletedQuestions = [];
      }
      this.assessment.deletedQuestions.push(question);
    }

    this.questions.splice(questionIndex, 1);
    this.updateQuestionOrder();
    this.onEdited();
    this.utilitiesService.setLtiHeight();
  }

  onQuestionEdited($event) {
    var question = $event.question,
      questionIndex = $event.questionIndex;

    this.questions[questionIndex] = question;
    this.onEdited();
  }

  onQuestionReordered($event) {
    const newQuestionIndex = $event.newQuestionIndex;
    const questionIndex = $event.questionIndex;
    const tempQuestion = cloneDeep(this.questions[newQuestionIndex]);

    //swap
    this.questions[newQuestionIndex] = this.questions[questionIndex];
    this.questions[questionIndex] = tempQuestion;
    this.updateQuestionOrder();
    this.focusToQuestion(this.questions[newQuestionIndex]);
    this.onEdited();
  }

  async saveAssessment() {
    //bit of an edge case, but make sure save success message still appears
    //even if no changes made to the data, technically
    this.saved = false;
    this.edited = true;
    if (!this.validate()) {
      this.utilitiesService.focusToElement('#qc-validation-error');
      return;
    }

    //wrap everything up in a nice little package to send to the server
    this.assessment.questions = this.questions;
    this.utilitiesService.loadingStarted();
    try {
      await this.assessmentEditService.updateAssessment(this.assessmentId, {'assessment': this.assessment});
    }
    catch (error) {
      this.saved = false;
      this.utilitiesService.showError(error);
      return;
    }

    await this.init(true); //reload quiz so we have correct IDs and such after saving
  }

  //very annoying that I have to do this, but apparently in Angular, ng-model will
  //not bind to the proper value for the assessment group/custom activity dropdowns
  //because it is an integer, but it is compared strictly with the string in the select
  //value; so I have to manually change the id values to a string so it will match;
  //the back-end shouldn't mind, but front-end does
  setModelIntegers() {
    this.assessment.assessment_group_id = this.assessment.assessment_group_id.toString();
    if (this.customActivity) {
      this.customActivity.id = this.customActivity.id.toString();
      this.assessment.custom_activity_id = this.assessment.custom_activity_id.toString();
    }
  }

  toggleShuffled() {
    if (this.assessment.shuffled == 'true') {
      this.assessment.shuffled = 'false';
    }
    else {
      this.assessment.shuffled = 'true';
    }

    this.onEdited();
  }

  updateQuestionOrder() {
    this.questions.forEach(function(question, index) {
      question.question_order = index + 1;
    });
  }

  validate() {
    this.validationError = false; //reset
    this.validationErrorList = []; //reset
    for (let question of this.questions) {
      if (question.validationError) {
        var error = 'Question #' + question.question_order + ': ' + question.validationError;
        this.validationErrorList.push(error);
      }
    }

    if (this.validationErrorList.length) {
      this.validationError = true;
      return false;
    }

    return true;
  }
}
