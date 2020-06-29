import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ManageService } from '../../../services/manage.service';

@Component({
  selector: 'qc-auto-grade',
  templateUrl: './auto-grade.component.html',
  styleUrls: ['./auto-grade.component.scss']
})
export class AutoGradeComponent implements OnInit {
  @Input() dueAt;
  @Input() pointsPossible;
  @Input() submissions;
  @Input() ungradedAttempts;
  @Input() utilitiesService;
  @Input() manageService: ManageService;
  @Output() onSuccess = new EventEmitter();

  error;
  graded = false;
  loading = false;
  paginationSize = 50;
  success = false;
  successfulSubmissions = [];
  ungradedAssessment = false;

  constructor() { }

  ngOnInit() {
    //if not placed in an assignment, or for 0 points, ungraded, no autograde possible
    if (this.submissions === null || this.pointsPossible === 0) {
      this.ungradedAssessment = true;
      this.graded = true;
      return;
    }

    //otherwise, if graded assignment, check to see if any remaining attempts to grade
    this.graded = !this.ungradedAttempts.length ? true : false;
  }

  autoGrade() {
    if (!this.isConfirmed()) {
      return false;
    }

    //reset if necessary
    this.error = false;
    this.success = false;

    if (!this.ungradedAttempts.length) {
      this.error = 'There are no ungraded attempts for this assessment.';
      this.loading = false;
      return;
    }

    //to make sure we don't run into any errors with max execution time in PHP on the back-end,
    //in the unlikely but possible scenario that a class with something crazy like 1000 students
    //doesn't have automatic grading on assessment submission, and the instructor wants to
    //auto-grade those 1000 students by clicking the button, we'll lump this into batches of 50
    var paginateGrading = this.ungradedAttempts > 50 ? true : false;
    this.sendGrades(this.ungradedAttempts, paginateGrading, 0);
  }

  beforeDueDate() {
    var currentTime = Date.now();
    if (currentTime < this.dueAt) {
      return true;
    }
    else {
      return false;
    }
  }

  isConfirmed() {
    var confirmMsg = 'Are you sure you wish to run the auto-grade function? This action ' +
      'cannot be undone. All students with ungraded assignments who have made an attempt ' +
      'will receive a grade in the gradebook calculated from their highest score made ' +
      'before the due date (if applicable). Students who have not made an attempt will ' +
      'remain ungraded. If you have a large class, this process may take several minutes.';

    //in regression testing, protractor flips out from js confirms/alerts
    if (this.utilitiesService.isRegressionEnv()) {
      return true;
    }

    return confirm(confirmMsg);
  }

  onAutogradeFinished(resp, data) {
    this.loading = false;
    if (!this.utilitiesService.isSuccessResponse(resp)) {
      var errorMessage = data.reason;
      this.error = errorMessage;
      return;
    }

    this.success = true;
    this.onSuccess.emit({ successfulSubmissions: this.successfulSubmissions });
  }

  async sendGrades(remainingAttempts, isPaginated, paginationNumber) {
    let resp;
    let data;
    let attemptsToGrade = [];
    let successfulSubmissions;
    const startIndex = this.paginationSize * paginationNumber;
    const endIndex = startIndex + this.paginationSize;

    if (!isPaginated) {
      attemptsToGrade = remainingAttempts;
    }
    else {
      attemptsToGrade = remainingAttempts.slice(startIndex, endIndex);
    }

    try {
      resp = await this.manageService.autoGrade({ 'attempts': attemptsToGrade });
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.error = this.utilitiesService.getError(error);
      this.loading = false;
      return;
    }

    successfulSubmissions = data.successfulSubmissions;
    this.successfulSubmissions = this.successfulSubmissions.concat(successfulSubmissions);

    if (isPaginated) {
      await this.sendNextPagination(paginationNumber, endIndex, remainingAttempts);
    }
    else {
      this.onAutogradeFinished(resp, data);
    }
  }

  async sendNextPagination(paginationNumber, startIndex, remainingAttempts) {
    var nextPage = paginationNumber + 1,
      nextAttempts = remainingAttempts.slice(startIndex),
      isPaginated = true;

    if (nextAttempts.length <= this.paginationSize) {
      isPaginated = false;
    }

    await this.sendGrades(nextAttempts, isPaginated, nextPage);
  }
}
