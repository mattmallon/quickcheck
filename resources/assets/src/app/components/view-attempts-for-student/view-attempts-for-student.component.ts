import { Component, OnInit } from '@angular/core';
import { UtilitiesService } from '../../services/utilities.service';
import { ManageService } from '../../services/manage.service';
import { Submission } from '../../classes/submission';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'qc-view-attempts-for-student',
  templateUrl: './view-attempts-for-student.component.html',
  styleUrls: ['./view-attempts-for-student.component.scss']
})
export class ViewAttemptsForStudentComponent implements OnInit {
  analyticsViewVisible = false;
  apiToken = null;
  assessmentsWithAttempts = [];
  courseContext = null;
  currentPage = 'results';
  displayedAssessments = []; //those shown to user (after filters, etc.)
  search = { assessmentName: '' };
  studentId = null;
  studentName = null;
  user = null;

  constructor(public utilitiesService: UtilitiesService, public authService: AuthService, public manageService: ManageService) {
    this.apiToken = this.authService.getInstructorTokenFromStorage();
    this.manageService.setApiToken(this.apiToken);
  }

  async ngOnInit() {
    let data;
    this.utilitiesService.loadingStarted();
    this.studentId = this.getStudentIdFromUrl();

    try {
      const resp = await this.manageService.getAttemptsForStudent(this.utilitiesService.contextId, this.studentId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.courseContext = data.courseContext;
    this.user = data.user;
    this.assessmentsWithAttempts = data.assessmentsWithAttempts;
    this.displayedAssessments = this.assessmentsWithAttempts; //default show all
    this.studentName = this.getStudentName();
    this.utilitiesService.setTitle('Quick Check Results - ' + this.studentName);
    this.utilitiesService.loadingFinished();
  }

  getStudentIdFromUrl() {
    var url = window.location.href,
      splitUrl = url.split('/student/'),
      idSplit = splitUrl[1].split('/'),
      studentId = idSplit[0];

    return studentId;
  }

  getStudentName() {
    //user from Canvas is in an array keyed by user ID to be consistent across components
    var userId = Object.keys(this.user)[0];
    return this.user[userId].name;
  }

  isAttemptsView() {
    if (!this.analyticsViewVisible) {
      return true;
    }

    return false;
  }

  isSubstringFound(string1, string2) {
    if (string1.toLowerCase().indexOf(string2.toLowerCase()) !== -1) {
      return true;
    } else {
      return false;
    }
  }

  searchAssessmentName() {
    this.displayedAssessments = this.assessmentsWithAttempts.filter((assessment) => {
      if (this.isSubstringFound(assessment.name, this.search.assessmentName)) {
        return true;
      }
    });
  }

  toggleAnalytics() {
    this.analyticsViewVisible = !this.analyticsViewVisible;
  }
}
