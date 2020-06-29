import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';
import { CollectionService } from '../../../services/collection.service';

@Component({
  selector: 'qc-qti-import',
  templateUrl: './qti-import.component.html',
  styleUrls: ['./qti-import.component.scss']
})
export class QtiImportComponent implements OnInit {
  @Input() assessmentGroups;
  @Input() isImportingQti;
  @Input() collectionService: CollectionService;
  @Output() onQtiImportCancel = new EventEmitter();

  assessmentGroupId = null;
  criticalNotices = [];
  done = false;
  error;
  notices = [];
  quizzes = [];
  uploading = false;
  zipFile = null;

  constructor(public utilitiesService: UtilitiesService) { }

  ngOnInit() {
    this.utilitiesService.setLtiHeight();
  }

  cancelQtiImport() {
    this.isImportingQti = false;
    this.onQtiImportCancel.emit({ canceled: true});
  }

  handleFileInput(files: FileList) {
    //source: https://stackoverflow.com/questions/47936183/angular-file-upload
    this.zipFile = files.item(0);
  }

  importQti() {
    if (this.zipFile) {
      this.uploadFile(this.zipFile);
    }
  }

  resetQtiImport() {
    this.assessmentGroupId = null;
    this.criticalNotices = [];
    this.done = false;
    this.error = false;
    this.notices = [];
    this.quizzes = [];
    this.uploading = false;
    this.zipFile = null;
    this.utilitiesService.setLtiHeight();
  }

  async saveImportQuizzes() {
    let data;
    this.uploading = true;
    this.done = false;

    try {
      const resp = await this.collectionService.createImportedQuizzes({ 'quizzes': this.quizzes });
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.quizzes = data.quizzes;
    this.uploading = false;
    this.done = true;
    this.notices = [];
    this.criticalNotices = [];
  }

  async uploadFile(file) {
    let resp;
    let data;
    this.uploading = true;

    try {
      resp = await this.collectionService.importQti(file, this.assessmentGroupId);
    }
    catch (error) {
      this.uploading = false;
      this.done = true;
      this.error = this.utilitiesService.getError(error);
      return;
    }

    this.uploading = false;
    this.done = true;
    if (!this.utilitiesService.isSuccessResponse(resp)) {
      this.error = this.utilitiesService.getError(resp);
      return;
    }

    data = this.utilitiesService.getResponseData(resp);
    const warnings = data.warnings;
    if (warnings.critical.length) {
      this.criticalNotices = warnings.critical;
    }
    this.notices = warnings.notices;
    this.quizzes = data.quizzes;
  }

}
