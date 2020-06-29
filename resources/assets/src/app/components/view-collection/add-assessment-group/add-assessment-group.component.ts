import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CollectionService } from '../../../services/collection.service';

@Component({
  selector: 'qc-add-assessment-group',
  templateUrl: './add-assessment-group.component.html',
  styleUrls: ['./add-assessment-group.component.scss']
})
export class AddAssessmentGroupComponent implements OnInit {
  @Input() collectionId;
  @Input() utilitiesService;
  @Input() collectionService: CollectionService;
  @Output() onSave = new EventEmitter();

  formOpen = false;
  newAssessmentGroup = null;

  constructor() { }

  ngOnInit() {
  }

  cancel() {
    this.formOpen = false;
    this.utilitiesService.setLtiHeight();
  }

  onSaveComplete(newAssessmentGroup) {
    //pass event up to parent, to add assessment group to the page
    this.onSave.emit({ newAssessmentGroup });
  }

  openForm() {
    this.formOpen = true;
    this.newAssessmentGroup = {};

    //move focus to appropriate header to orient screenreader users
    this.utilitiesService.focusToElement('#create-assessmentgroup-header');
    this.utilitiesService.setLtiHeight();
  }

  async save() {
    let data;
    this.newAssessmentGroup.collection_id = this.collectionId;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.collectionService.createAssessmentGroup(this.newAssessmentGroup);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.onSaveComplete(data.assessmentGroup);
    this.formOpen = false;
    this.newAssessmentGroup = {};
    this.utilitiesService.loadingFinished();
  }
}
