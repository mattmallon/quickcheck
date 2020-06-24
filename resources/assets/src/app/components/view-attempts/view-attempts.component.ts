import { Component, OnInit } from '@angular/core';
import { UtilitiesService } from '../../services/utilities.service';
import { ManageService } from '../../services/manage.service';
import { Submission } from '../../classes/submission';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'qc-view-attempts',
  templateUrl: './view-attempts.component.html',
  styleUrls: ['./view-attempts.component.scss']
})
export class ViewAttemptsComponent implements OnInit {
  analyticsViewVisible = false;
  apiToken = null;
  assessment = null;
  assessmentId = '';
  assignmentId = '';
  assignment = null;
  attempts = []; //all attempts
  canvasCourse = null;
  courseContext = null;
  currentPage = 'results';
  displayedAttempts = []; //those shown to user (after filters, etc.)
  dueAt = null;
  fatalError = null;
  gradesLoading = true;
  largeClassSize = false;
  pointsPossible = 0;
  questions = [];
  release = false;
  responseAttempt = null;
  responseViewVisible = false;
  search = { 'studentLastName': '', timer: null }; //for searching through students
  showUngradedOnly = false;
  studentResponses = [];
  submissions = [];
  ungradedAttempts = [];
  users = [];

  constructor(
    public utilitiesService: UtilitiesService,
    public authService: AuthService,
    private manageService: ManageService,
    private route: ActivatedRoute)
  {
    this.apiToken = this.authService.getInstructorTokenFromStorage();
    this.manageService.setApiToken(this.apiToken);
  }

  async ngOnInit() {
    let data;
    this.assessmentId = this.route.snapshot.paramMap.get('assessmentId');
    this.assignmentId = this.route.snapshot.paramMap.get('assignmentId');
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.manageService.getAttemptsAndResponses(this.assessmentId, this.assignmentId, this.utilitiesService.contextId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      this.fatalError = true;
      return;
    }

    await this.initAttemptData(data);
    this.utilitiesService.loadingFinished();
    this.getUsers();
  }

  addBestAttempt(currentBestAttempt, attemptsToGrade) {
    //if the user didn't have any valid attempts before the due date, return out
    if (!currentBestAttempt) {
      return false;
    }

    var currentUser = currentBestAttempt.student.lti_custom_user_id,
      submission = new Submission(currentBestAttempt, this.pointsPossible, this.submissions);
    //since we've now gone through all attempts for the previous user, we know for sure what the highest score was;
    //if the assignment is gradeable, as yet ungraded, and student is still in course, then add to the list
    const needsGrade = (submission.needsGrade() && this.users[currentUser]) ? true : false;
    if (needsGrade) {
      attemptsToGrade.push({
        'attemptId': currentBestAttempt.id
      });
    }
  }

  //loop through all attempts in O(N) time to get highest calculated score before the
  //due date for ungraded assignments; attempts are already sorted by name/user, so
  //we move on down the list and change the current user info as soon as we reach an
  //attempt where the user ID is different; before we change to the next user, we've
  //sorted through all attempts for the previous user and know which attempt has the
  //highest score before the due date, so if the assignment is gradeable, ungraded,
  //and the user is still in the course, then add attempt to ungraded list
  getHighestScoresBeforeDueDate() {
    var attemptsToGrade = [],
      currentBestAttempt = null,
      currentUserId = this.attempts[0].student.lti_custom_user_id,//initialize for beginning
      needsGrade = false;

    for (let [index, attempt] of this.attempts.entries()) {
      //when we reach the next user in the sorted list
      if (attempt.student.lti_custom_user_id !== currentUserId) {
        this.addBestAttempt(currentBestAttempt, attemptsToGrade);
        currentUserId = attempt.student.lti_custom_user_id;
        currentBestAttempt = null;
      }

      if (!this.isLate(attempt)) {
        if (!currentBestAttempt) {
          currentBestAttempt = attempt;
        }
        else if (+(attempt.calculated_score) > currentBestAttempt.calculated_score) {
          currentBestAttempt = attempt;
        }
      }
    }

    //if end of the array, no next user to compare to, so check just for this last user
    this.addBestAttempt(currentBestAttempt, attemptsToGrade);

    return attemptsToGrade;
  }

  //fetch submissions/grades
  async getSubmissions() {
    let data;

    try {
      const resp = await this.manageService.getAttemptSubmissions(this.assessmentId, this.assignmentId, this.utilitiesService.contextId);
      data  = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.submissions = data.submissions;
    //determine if any assignments need to be graded
    if (this.attempts.length && this.submissions) {
      this.ungradedAttempts = this.getHighestScoresBeforeDueDate();
    }
    this.gradesLoading = false;
  }

  async getUsers() {
    let data;
    if (!this.courseContext || this.largeClassSize) {
      return;
    }

    //fetch users so we can determine if any have dropped; this is necessary
    //since grade passback would result in an error for a dropped student
    try {
      const resp = await this.manageService.getUsersInCourse(this.courseContext.lti_custom_course_id);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.users = data.users;
    this.getSubmissions(); //get submissions next; only mark ungraded if user is still in course
  }

  hideResponses() {
    this.responseViewVisible = false;
    this.utilitiesService.setLtiHeight();
  }

  initAttemptData(attemptData) {
    this.attempts = attemptData.attempts;
    this.displayedAttempts = this.attempts;
    this.assessment = attemptData.assessment;
    this.assignment = attemptData.assignment;
    this.courseContext = attemptData.courseContext;
    this.canvasCourse = attemptData.canvasCourse;
    //if graded/an assignment
    if (this.assignment) {
      this.pointsPossible = this.assignment.points_possible;
      if (this.assignment.due_at && this.assignment.due_at != 0) {
        var timezone = this.courseContext.time_zone,
          dueAtDate = new Date(+(this.assignment.due_at) * 1000),
          dueAt = this.utilitiesService.convertTimeWithTimezone(dueAtDate, timezone, true);
        this.dueAt = this.utilitiesService.formatTimeWithTimeZone(dueAt, timezone);
      }
    }
    if (attemptData.release) {
      this.release = attemptData.release;
    }
    //if a very large course, grading functionality disabled for performance
    if (this.isLargeClassSize()) {
      this.largeClassSize = true;
    }

    this.utilitiesService.setTitle('Quick Check Results - ' + this.assessment.name);
  }

  isAttemptsView() {
    if (!this.responseViewVisible && !this.analyticsViewVisible) {
      return true;
    }

    return false;
  }

  isLate(attempt) {
    if (!attempt.due_at) {
      return false;
    }

    //convert by timezone -- attempt updated_at is in the default server timezone,
    //whereas the dueAt timestamp is in the timezone specific to the course
    var timezone = this.courseContext.time_zone,
      updatedAt = this.utilitiesService.convertTimeWithTimezone(attempt.updated_at, timezone),
      dueAt = this.utilitiesService.convertTimeWithTimezone(attempt.due_at, timezone, true);

    if (updatedAt >= dueAt) {
      return true;
    }

    return false;
  }

  isLargeClassSize() {
    if (this.canvasCourse.total_students > 1000) {
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

  onAutoGradeSuccess($event) {
    var successfulSubmissions = $event.successfulSubmissions;
    for (let successfulSubmission of successfulSubmissions) {
      var attempt = successfulSubmission.attempt,
        score = successfulSubmission.score * 100, //back-end 0-1 scale, front-end is 0-100
        submission = new Submission(attempt, this.pointsPossible, this.submissions);

      submission.update(score);
    }
  }

  searchStudentLastName() {
    //debounce 500ms so it's not laggy
    if (this.search.timer) {
      clearTimeout(this.search.timer);
    }

    this.search.timer = setTimeout(() => {
      this.displayedAttempts = this.attempts.filter((attempt) => {
        if (this.isSubstringFound(attempt.student.lis_person_name_family, this.search.studentLastName)) {
          return true;
        }
      });
    }, 500);
  }

  //for infinite scrolling, need a bit of a scrollbar in iframe
  //this might not be necessary with updated versions of angular, so not
  //currently being used, but available if needed
  setScrollingLtiHeight() {
    this.utilitiesService.setScrollingLtiHeight(100);
    this.utilitiesService.setLtiHeight();
  }

  toggleAnalytics() {
    this.analyticsViewVisible = !this.analyticsViewVisible;
    if (this.analyticsViewVisible) {
      this.utilitiesService.setLtiHeight();
    }
    else {
      this.utilitiesService.setLtiHeight();
    }
  }

  toggleUngraded() {
    this.showUngradedOnly = !this.showUngradedOnly;
    if (this.showUngradedOnly) {
      this.displayedAttempts = this.attempts.filter((attempt) => {
        var submission = new Submission(attempt, this.pointsPossible, this.submissions);
        if (submission.needsGrade()) {
          return true;
        }
      });
    }
    else {
      this.displayedAttempts = this.attempts; //reset to original
    }
  }

  async viewResponses($event) {
    const attempt = $event.attempt;
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.manageService.getStudentResponses(attempt.id);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.responseAttempt = attempt;
    this.questions = data.questions;
    this.studentResponses = data.responses;
    this.responseViewVisible = true;
    this.utilitiesService.loadingFinished('#response-header');
  }
}
