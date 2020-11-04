import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AssessmentEditService } from '../../../services/assessment-edit.service';
import { CollectionService } from '../../../services/collection.service';
import * as cloneDeep from 'lodash/cloneDeep';

@Component({
  selector: 'qc-assessment-group',
  templateUrl: './assessment-group.component.html',
  styleUrls: ['./assessment-group.component.scss']
})
export class AssessmentGroupComponent implements OnInit {
  @Input() assessmentGroup;
  @Input() assessmentGroupIndex;
  @Input() readOnly;
  @Input() collectionService: CollectionService;
  @Input() assessmentEditService: AssessmentEditService;
  @Input() utilitiesService;
  @Output() onAssessmentCopy = new EventEmitter();
  @Output() onDelete = new EventEmitter();

  editingData = null;
  focusEditAssessmentGroup = '';
  focusNewAssessment = '';
  focusSaveAssessment = '';
  focusUpdateAssessmentGroup = '';
  isAddingAssessment = null;
  isEditing = false;
  memberships = null;
  newAssessment = null;

  constructor() { }

  ngOnInit() {
    //initialize element selectors that can be focused to for accessibility
    this.focusEditAssessmentGroup = '#assessment-group-name-' + this.assessmentGroup.id;
    this.focusNewAssessment = '#create-assessment-header-' + this.assessmentGroup.id;
    this.focusSaveAssessment = '#assessment-edit-'; //assessment ID filled in as needed
    this.focusUpdateAssessmentGroup = '#heading-group-' + this.assessmentGroup.id;

    //if a newly created assessment group, initialize empty array of assessments
    if (!this.assessmentGroup.assessments) {
      this.assessmentGroup.assessments = [];
    }

    //initialize copied data for editing, so in-progress, unsaved edits don't change the UI
    this.editingData = cloneDeep(this.assessmentGroup)

    this.utilitiesService.setLtiHeight();
  }


  async copyAssessment(assessment) {
    this.utilitiesService.loadingStarted();
    let data;
    var paramData = {
      'assessment_group_id': assessment.copyData.assessment_group_id,
      'assessment_name': assessment.copyData.assessment_name
    };

    try {
      const resp = await this.collectionService.copyAssessment(assessment.id, paramData);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    const assessmentId = data.assessment.id;
    let assessmentEditUrl = '/assessment/' + assessmentId + '/edit';

    if (this.utilitiesService.isLti) {
      assessmentEditUrl = this.utilitiesService.setContextLink(assessmentEditUrl);
    }

    assessment.copyData.editUrl = assessmentEditUrl;
    assessment.copyData.copied = true;

    //if within the same subset, add to this component
    if (assessment.copyData.assessment_group_id == this.assessmentGroup.id) {
      this.assessmentGroup.assessments.push(data.assessment);
    }
    //if within the same set, fire even to parent to add to the page
    else if (assessment.copyData.collection_id == this.assessmentGroup.collection_id) {
      this.onAssessmentCopy.emit({ assessment: data.assessment });
    }

    this.utilitiesService.setLtiHeight();
  }

  copyAssessmentCancel(assessment) {
    assessment.isCopying = false;
    assessment.copyData = {};
    this.utilitiesService.setLtiHeight();
  }

  async deleteAssessment(id, index) {
    let data;
    if (!window.confirm('Are you sure you want to delete this quick check?')) {
      return;
    }

    try {
      const resp = await this.assessmentEditService.deleteAssessment(id);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.assessmentGroup.assessments.splice(index, 1);
  }

  async deleteAssessmentGroup($event) {
    let data;
    this.stopAccordion($event); //prevent accordion from getting toggled by button click

    if (!window.confirm('Are you sure you want to delete this subset?')) {
      return;
    }

    this.utilitiesService.loadingStarted();
    try {
      const resp = await this.collectionService.deleteAssessmentGroup(this.assessmentGroup.id)
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.utilitiesService.loadingFinished();
    //pass event up to parent, so that this assessment group can be removed from the
    //array, which this component does not and should not have access to
    this.onDelete.emit({assessmentGroupIndex: this.assessmentGroupIndex});
  }

  editAssessmentGroup($event) {
    this.stopAccordion($event);
    //copy model, in case user makes updates and then cancels, so that existing model doesn't change on the page
    this.editingData = cloneDeep(this.assessmentGroup);
    this.isEditing = true;

    //move focus to appropriate header to orient screenreader users
    this.utilitiesService.focusToElement(this.focusEditAssessmentGroup);
  }

  editAssessmentGroupCancel() {
    this.isEditing = false;
  }

  async getMemberships() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.collectionService.getMembershipsWithAssessments();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.memberships = data.memberships;
    this.utilitiesService.loadingFinished();
  }

  async initCopyAssessment(assessment) {
    //load once from back-end and then cache
    if (!this.memberships) {
      await this.getMemberships();
    }

    this.setCopyAssessmentDefault(assessment);

    assessment.isCopying = true;
    this.utilitiesService.setLtiHeight();
  }

  initNewAssessment() {
    this.isAddingAssessment = true;
    this.newAssessment = {};

    //move focus to appropriate header to orient screenreader users
    this.utilitiesService.focusToElement(this.focusNewAssessment);
    this.utilitiesService.setLtiHeight();
  }

  newAssessmentCancel() {
    this.isAddingAssessment = false;
  }

  onCopyAssessmentCollectionSelected(assessment) {
    var collectionId = assessment.copyData.collection_id;
    for (let membership of this.memberships) {
      if (membership.collection.id == collectionId) {
        const assessmentGroups = membership.collection.assessment_groups;
        assessment.copyData.assessmentGroups = assessmentGroups;
        assessment.copyData.assessment_group_id = assessmentGroups[0].id;
        return;
      }
    }
  }

  async saveNewAssessment() {
    //tried to set this as hidden input and bind to newAssessment model, but since newAssessment is blank, it overrode the value
    this.newAssessment.assessment_group_id = this.assessmentGroup.id;
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.assessmentEditService.saveAssessment(this.newAssessment);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.newAssessment = {};
    this.isAddingAssessment = false;
    this.assessmentGroup.assessments.push(data.assessment);
    this.utilitiesService.focusToElement(this.focusSaveAssessment + data.assessment.id);
    this.utilitiesService.loadingFinished();
  }

  //default to the current set/subset, with "copy" appended to name
  setCopyAssessmentDefault(assessment) {
    assessment.copyData = {};
    assessment.copyData.collection_id = +(this.assessmentGroup.collection_id);
    this.onCopyAssessmentCollectionSelected(assessment); //set possible assessment group options
    assessment.copyData.assessment_group_id = +(this.assessmentGroup.id);
    assessment.copyData.assessment_name = assessment.name + ' copy';
  }

  //when editing a subset, if a user clicks on the input or cancel buttons, stop accordion from opening/closing
  stopAccordion($event) {
    $event.stopPropagation();
  }

  toggleAccordion() {
    this.assessmentGroup.closed = !this.assessmentGroup.closed;
  }

  async updateAssessmentGroup() {
    let data;
    this.isEditing = false;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.collectionService.updateAssessmentGroup(this.assessmentGroup.id, this.editingData);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    //really the only attribute that the user can change
    this.assessmentGroup.name = data.assessmentGroup.name;
    this.utilitiesService.focusToElement(this.focusUpdateAssessmentGroup);
  }
}
