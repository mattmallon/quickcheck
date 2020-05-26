import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'qc-attempt-data',
  templateUrl: './attempt-data.component.html',
  styleUrls: ['./attempt-data.component.scss']
})
export class AttemptDataComponent implements OnInit {
  @Input() attempts;
  @Input() courseContext;
  @Input() gradesLoading;
  @Input() isStudent;
  @Input() isVisible;
  @Input() largeClassSize;
  @Output() onViewResponses = new EventEmitter();
  @Input() pointsPossible;
  @Input() showResponses;
  @Input() submissions;
  @Input() users;
  @Input() utilitiesService;

  itemSize = 45; //angular infinite scrolling requires item size
  studentsWithFirstRow = {}; //for tracking table borders, etc.

  constructor() { }

  ngOnInit() {
    this.parseAttempts();
    //this.utilitiesService.setLtiHeight();
  }

  ngOnChanges(changes) {
    //if attempts array is updated (such as on a search) then
    //we need to reformat the incoming data
    if (changes.attempts) {
      this.parseAttempts();
    }
  }

  dateDiff(createdAt, updatedAt) {
    createdAt = this.utilitiesService.convertSqlTimestamp(createdAt);
    updatedAt = this.utilitiesService.convertSqlTimestamp(updatedAt);

    var milliseconds = updatedAt - createdAt,
      seconds = Math.floor(milliseconds / 1000);

    return this.utilitiesService.formatDateDiff(seconds);
  }

  getCalculatedScore(attempt) {
    return attempt.calculated_score * 100;
  }

  //custom activities send count correct to the back-end, but quizzes calculate based on responses
  getCountCorrect(attempt) {
    if (attempt.count_correct !== null) {
      return attempt.count_correct;
    }

    let countCorrect = 0;
    for (let response of attempt.student_responses) {
      if (response.is_correct == '1') {
        countCorrect++;
      }
    }
    return countCorrect;
  }

  //custom activities send count correct to the back-end, but quizzes calculate based on responses
  getCountIncorrect(attempt) {
    if (attempt.count_incorrect !== null) {
      return attempt.count_incorrect;
    }

    let countIncorrect = 0;
    for (let response of attempt.student_responses) {
      if (response.is_correct == '0') {
        countIncorrect++;
      }
    }

    return countIncorrect;
  }

  //identify used in trackBy with *ngFor to speed up performance
  identify(index, attempt) {
    return attempt.id;
  }

  isFirstRowForStudent(attempt) {
    var key = 'user-' + attempt.student.lti_custom_user_id; //in case the user id starts with an int
    if (this.studentsWithFirstRow[key]) {
      return false;
    }

    this.studentsWithFirstRow[key] = true;
    return true;
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

  parseAttempts() {
    for (let attempt of this.attempts) {
      if (this.isLate(attempt)) {
        attempt.isLate = true;
      }
      if (this.isStudent) { //skip the last part if a student
        continue;
      }
      if (this.isFirstRowForStudent(attempt)) {
        attempt.firstRowForStudent = true;
      }
    }
  }

  responsesAvailable(attempt) {
    if (!attempt.student_responses.length) {
      return false;
    }

    if (!this.showResponses) {
      return false;
    }

    return true;
  }

  viewResponses(attempt) {
    this.onViewResponses.emit({ attempt });
  }
}
