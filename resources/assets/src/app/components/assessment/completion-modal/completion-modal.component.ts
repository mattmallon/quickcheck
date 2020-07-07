import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';
import { AssessmentService } from '../../../services/assessment.service';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';

@Component({
  selector: 'qc-completion-modal',
  templateUrl: './completion-modal.component.html',
  styleUrls: ['./completion-modal.component.scss']
})
export class CompletionModalComponent implements OnInit {
  @Input() attemptId;
  @Input() complete;
  @Input() pointsPossible;
  @Input() score;
  @Output() onRestart = new EventEmitter();

  error = false;
  graded;
  isInModule = false;
  loading = false;

  constructor(
    public utilitiesService: UtilitiesService,
    private assessmentService: AssessmentService,
    private bsModalRef: BsModalRef,
    private bsModalService: BsModalService
    ) { }

  async ngOnInit() {
    if (!this.complete) {
      return;
    }

    if (this.complete.currentValue === false) {
      return;
    }

    await this.submitGrade();
    this.isInModule = this.utilitiesService.isInCanvasModule();
  }

  isAutomaticPassback() {
    if (this.graded === 'graded') {
      return true;
    }

    return false;
  }

  isPendingPassback() {
    if (this.graded === 'pending') {
      return true;
    }

    return false;
  }

  isUngraded() {
    if (!this.graded) {
      return true;
    }

    return false;
  }

  restart() {
    this.bsModalService.setDismissReason('restart');
    this.bsModalRef.hide();
  }

  async submitGrade() {
    //doubt this would happen, but just in case, make sure
    //grade is not re-submitted
    if (this.graded) {
      return false;
    }

    let data;
    this.loading = true;
    this.error = false; //reset if error encountered previously
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.assessmentService.gradePassback(this.attemptId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.loading = false;
      const serverError = this.utilitiesService.getQuizError(error);
      const errorMessage = serverError ? serverError : 'Error submitting grade.';
      this.error = errorMessage;
      this.utilitiesService.loadingFinished();
      return;
    }

    this.graded = data.attemptGraded;
    this.loading = false;
    this.utilitiesService.loadingFinished();
  }
}
