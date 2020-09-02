import { Component, OnInit } from '@angular/core';
import { UtilitiesService } from '../../services/utilities.service';
import { ManageService } from '../../services/manage.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'qc-attempts-overview',
  templateUrl: './attempts-overview.component.html',
  styleUrls: ['./attempts-overview.component.scss']
})
export class AttemptsOverviewComponent implements OnInit {
  apiToken = null;
  attempts = [];
  currentPage = 'results';
  embeds = {}; //if same assessment is embedded in multiple assignments, split into separate entries
  isResultsByStudentToggled = false;
  sessionStorageKey = 'iu-eds-quickcheck-student-results-toggle';
  search = {
    'assessmentName': '',
    'studentName': ''
  };
  students = [];

  constructor(public utilitiesService: UtilitiesService, private manageService: ManageService, public authService: AuthService)
  {
    this.apiToken = this.authService.getInstructorTokenFromStorage();
    this.manageService.setApiToken(this.apiToken);
  }

  ngOnInit() {
    this.utilitiesService.setTitle('Quick Check results');

    if (this.isResultsByStudentToggleEnabled()) {
      this.isResultsByStudentToggled = true;
      this.getStudents();
    }
    else {
      this.getAssessments();
    }
  }

  async getAssessments() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.manageService.getOverview(this.utilitiesService.contextId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    //if assessment is embedded in multiple assignments (or assignment + module item), separate results view for each
    for (let attempt of data.attempts) {
      const assessmentId = attempt.assessment_id.toString();
      let assignmentId = this.getAssignmentId(attempt); //note: may be NULL if a module item or LTI 1.1 historic attempt

      let embeds = this.embeds[assessmentId];
      if (!embeds) {
         embeds = [];
      }

      embeds.push(assignmentId);
      this.embeds[assessmentId] = embeds;
    }

    //attempts are grouped by unique assessment id, so we're not getting ALL attempts;
    //each attempt comes with the unique assessment, for us to put onto the page
    this.attempts = data.attempts;
    this.utilitiesService.loadingFinished();
  }

  getAssignmentId(attempt) {
    //1.1 attempts that were graded
    if (attempt.lti_custom_assignment_id) {
      return attempt.lti_custom_assignment_id;
    }

    //1.1 and 1.3 attempts that are ungraded
    if (!attempt.line_item) {
      return null;
    }

    //graded 1.3 attempts
    return attempt.line_item.lti_custom_assignment_id;
  }

  getDuplicateEmbedName(attempt) {
    const embeds = this.embeds[attempt.assessment_id.toString()];

    if (!embeds) {
      return '';
    }

    if (embeds.length > 1) {
      let assignmentTitle = attempt.assignment_title;
      if (!assignmentTitle) {
        assignmentTitle = 'module item';
      }

      return `(embedded in: ${assignmentTitle})`;
    }

    return '';
  }

  async getStudents() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.manageService.getStudentsByContext(this.utilitiesService.contextId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.students = data.students;
    this.utilitiesService.loadingFinished();
  }

  isResultsByStudentToggleEnabled() {
    if (!this.storageAvailable()) {
      return false;
    }

    return JSON.parse(sessionStorage.getItem(this.sessionStorageKey));
  }

  isSubstringNotFound(string1, string2) {
    if (string1.toLowerCase().indexOf(string2.toLowerCase()) === -1) {
      return true;
    }
    else {
      return false;
    }
  }

  isViewingByStudent() {
    if (this.isResultsByStudentToggled) {
      return true;
    }

    return false;
  }

  //determine if local storage is available
  //source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
  storageAvailable() {
    const type = 'sessionStorage';
    try {
      var storage = window[type],
        x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  }

  toggleStudentResultsView() {
    if (this.isResultsByStudentToggled) {
      this.isResultsByStudentToggled = false;

      if (this.storageAvailable()) {
        sessionStorage.setItem(this.sessionStorageKey, 'false');
      }

      if (this.attempts.length) {
        return;
      }

      this.getAssessments();

      return;
    }

    this.isResultsByStudentToggled = true;

    if (this.storageAvailable()) {
      sessionStorage.setItem(this.sessionStorageKey, 'true');
    }

    //only fetch students once, cache in memory afterward
    if (this.students.length) {
      return;
    }

    this.getStudents();

    return;
  }
}
