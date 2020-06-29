import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { ManageService } from '../../../services/manage.service';
import { Submission } from '../../../classes/submission';

@Component({
  selector: 'qc-grade',
  templateUrl: './grade.component.html',
  styleUrls: ['./grade.component.scss']
})
export class GradeComponent implements OnInit {
  @Input() attempt;
  @Input() pointsPossible;
  @Input() submissions;
  @Input() users;
  @Input() manageService: ManageService;
  @Input() utilitiesService;

  editedGradeValue;
  editingGrade = false;
  error;
  gradeLoading = false;
  isUserInCourse = true;
  submission = null;

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges() {
		if (!this.isTestStudent()) { //do not show test student as dropped; not in course roster
			this.isUserInCourse = this.users[this.attempt.student.lti_custom_user_id] ? true : false;
		}
		this.submission = new Submission(this.attempt, this.pointsPossible, this.submissions);
  }

  cancelGradeSubmit() {
		this.error = false;
		this.editingGrade = false;
		this.gradeLoading = false;
	}

	editGrade() {
		this.error = false; //reset in case there was an error previously
		this.editingGrade = true;
		this.editedGradeValue = this.submission.calculateGrade();
		this.utilitiesService.focusToElement('#grade-submission-' + this.attempt.id);
	}

	isGradeValid() {
		if (isNaN(this.editedGradeValue) || isNaN(parseInt(this.editedGradeValue))) {
			this.error = 'The grade must be a number!';
			return false;
		}

		var gradeInteger = parseInt(this.editedGradeValue);

		if (gradeInteger > 100 || gradeInteger < 0) {
			this.error = 'The grade must be between 0 and 100';
			return false;
		}

		return true;
	}

	//ensure that Canvas Test Student is not shown as dropped, since not in course
	isTestStudent() {
		var student = this.attempt.student;
		if (student.lis_person_name_given === 'Test' && student.lis_person_name_family === 'Student') {
			return true;
		}

		return false;
	}

	async submitGrade() {
		let data;
		if (!this.isGradeValid()) {
			return false;
		}

		//grades are displayed as 0-100 for instructor, but passed to back-end on a 0-1 scale
		var gradeData = { 'sourcedId': this.attempt.lis_result_sourcedid, 'grade': (this.editedGradeValue / 100).toString() };
		this.gradeLoading = true;

		try {
			const resp = await this.manageService.submitGrade(gradeData);
			data = this.utilitiesService.getResponseData(resp);
		}
		catch (error) {
			this.error = this.utilitiesService.getError(error);
		  this.gradeLoading = false;
		  return;
		}

		//if previously received an error, then undo it
		this.error = false;
		this.submission.update(this.editedGradeValue);
		this.gradeLoading = false;
		this.editingGrade = false;
		this.utilitiesService.focusToElement('#grade-' + this.attempt.id);
	}
}
