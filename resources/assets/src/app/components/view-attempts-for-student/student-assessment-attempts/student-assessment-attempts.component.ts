import { Component, OnInit, Input } from '@angular/core';
import { ManageService } from '../../../services/manage.service';

@Component({
  selector: 'qc-student-assessment-attempts',
  templateUrl: './student-assessment-attempts.component.html',
  styleUrls: ['./student-assessment-attempts.component.scss']
})
export class StudentAssessmentAttemptsComponent implements OnInit {
  @Input('assessmentWithAttempts') assessment;
  @Input() courseContext;
  @Input() studentId;
  @Input() user;
  @Input() manageService: ManageService;
  @Input() utilitiesService;

  attempts = [];
  accordionClosed = true;
  dueAt = false;
  gradesLoading = true;
  pointsPossible = null;
  questions = [];
  responseAttempt = null;
  responseViewVisible = false;
  studentResponses = [];
  submission = null;
  timezone = null;

  constructor() { }

  ngOnInit() {
    this.attempts = this.assessment.attempts;
    this.utilitiesService.setLtiHeight();
  }

  getDueAt() {
    var dueAt,
      dueAtInTimezone;

    this.timezone = this.courseContext.time_zone;
    dueAt = this.attempts[0].due_at;
    if (!dueAt || dueAt == 0) {
      return false;
    }

    dueAtInTimezone = this.utilitiesService.convertTimeWithTimezone(dueAt, this.timezone, true);
    this.dueAt = this.utilitiesService.formatTimeWithTimeZone(dueAtInTimezone, this.timezone);
  }

  hideResponses() {
    this.responseViewVisible = false;
    this.utilitiesService.setLtiHeight();
  }

  isAccordionClosed() {
    if (this.accordionClosed) {
      return true;
    }

    return false;
  }

  async loadGrade() {
    let data;

    try {
      const resp = await this.manageService.getStudentSubmission(this.assessment.id, this.utilitiesService.contextId, this.studentId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    //submission and pointsPossible not included if not embedded in a graded assignment
    if (data.assignment) {
      this.submission = data.submission;
      this.pointsPossible = data.assignment.points_possible;
      this.getDueAt();
    }
    this.gradesLoading = false;
  }

  toggleAccordion() {
    this.accordionClosed = !this.accordionClosed;
    this.utilitiesService.setLtiHeight();

    if (!this.gradesLoading) {
      return;
    }

    //load grades once, the first time the accordion is opened
    this.loadGrade();
  }

  async viewResponses($event) {
    let data;
    const attempt = $event.attempt;

    try {
      const resp = await this.manageService.getStudentResponses(attempt.id);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.responseAttempt = attempt;
    this.studentResponses = data.responses;
    this.questions = data.questions;
    this.responseViewVisible = true;
  }
}
