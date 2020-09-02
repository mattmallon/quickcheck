export class Submission {
  attempt;
  pointsPossible;
  userSubmission;

  constructor(attempt, pointsPossible, submissions) {
    this.attempt = attempt;
    this.pointsPossible = pointsPossible;
    this.userSubmission = submissions ? submissions[attempt.student.lti_custom_user_id] : null;
  }

  calculateGrade() {
    if (!this.userSubmission) {
      return '';
    }

    const score = this.userSubmission.score / this.pointsPossible * 100;
    const roundedScore = Math.round(score * 100) / 100;

    return roundedScore;
  }

  isGradeable() {
    if (!this.attempt.line_item_id) { //instructor/designer OR ungraded
      return false;
    }
    if (this.pointsPossible === 0) {
      return false;
    }

    return true;
  }

  isGraded() {
    if (!this.isGradeable()) {
      return false;
    }

    if (!this.userSubmission) {
      return false; //if user not found
    }

    if (this.userSubmission.workflow_state === 'graded') {
      return true;
    }

    return false; //user in course, graded assignment, but no graded submission
  }

  isHistoricLtiAttempt() {
    if (this.attempt.lti_custom_assignment_id) {
      return true;
    }

    return false;
  }

  needsGrade() {
    if (this.isGradeable() && !this.isGraded()) {
      return true;
    }
  }

  update(score) {
    const grade = (+(score) / 100) * this.pointsPossible;
    this.userSubmission.score = grade;
    this.userSubmission.workflow_state = 'graded';
  }
}
