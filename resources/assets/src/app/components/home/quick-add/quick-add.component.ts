import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';
import { CollectionService } from '../../../services/collection.service';

@Component({
  selector: 'qc-quick-add',
  templateUrl: './quick-add.component.html',
  styleUrls: ['./quick-add.component.scss']
})
export class QuickAddComponent implements OnInit {
  @Input() utilitiesService: UtilitiesService;
  @Input() apiToken;
  @Output() onCancel = new EventEmitter();

  assessment = { collection: { id: '', name: null, assessment_groups: [] }, assessmentGroup: { id: '', name: null }, name: null }; //data to be passed back if adding a new quick check
  memberships = []; //if adding, possible collections/assessment groups new assessment can belong to
  newCollectionAdded = false; //if adding a new collection on the fly
  newAssessmentGroupAdded = false; //if adding a new assessment group on the fly
  selectedCollection = { id: '', name: null, assessment_groups: []}; //if adding, collection selected, from which we can draw assessment groups to select

  constructor(private collectionService: CollectionService) { }

  async ngOnInit() {
    this.collectionService.setApiToken(this.apiToken);
    await this.getSets();
  }

  cancelAdd() {
    //don't really need to send any data up to the parent component,
    //but also don't want unexpected angular errors if $event missing
    this.onCancel.emit({
      $event: {
        cancel: true
      }
    });
  }

  collectionSelected() {
    if (this.assessment.collection.id === 'new') {
      this.newCollectionAdded = true;
      this.assessment.collection.name = '';
      this.assessment.assessmentGroup = {'id' : 'new', 'name': ''};
    }
    //since we can't assign an entire collection object to the value in a select dropdown,
    //we have to assign ID value to select and search through our collections to find the one
    else {
      this.newCollectionAdded = false;
      for (let membership of this.memberships) {
        if (membership.collection.id == this.assessment.collection.id) {
          this.selectedCollection = membership.collection;
          return;
        }
      }
    }
  }

  async getSets () {
    let data;

    try {
      const resp = await this.collectionService.getMembershipsWithAssessments();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
    }

    this.memberships = data.memberships;
  }

  groupSelected() {
    if (this.assessment.assessmentGroup.id === 'new') {
      this.newAssessmentGroupAdded = true;
    }
    else {
      this.newAssessmentGroupAdded = false;
    }
  }

  async saveAssessment() {
    let data;

    //if not adding anything new, remove extraneous properties
    if (this.assessment.collection.name === null) {
      delete this.assessment.collection.name;
    }

    if (this.assessment.assessmentGroup.name === null) {
      delete this.assessment.assessmentGroup.name;
    }

    try {
      const resp = await this.collectionService.quickAdd({'assessment': this.assessment});
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
    }

    const assessmentId = data.assessmentId;
    let assessmentEditUrl = '/assessment/' + assessmentId + '/edit';
    if (this.utilitiesService.isLtiContext()) {
      assessmentEditUrl = this.utilitiesService.setContextLink(assessmentEditUrl);
    }

    window.location.assign(assessmentEditUrl);
  }
}
