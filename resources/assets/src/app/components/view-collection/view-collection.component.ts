import { Component, OnInit } from '@angular/core';
import { CollectionService } from '../../services/collection.service';
import { UserService } from '../../services/user.service';
import { AssessmentEditService } from '../../services/assessment-edit.service';
import { UtilitiesService } from '../../services/utilities.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'qc-view-collection',
  templateUrl: './view-collection.component.html',
  styleUrls: ['./view-collection.component.scss']
})
export class ViewCollectionComponent implements OnInit {
  apiToken = null;
  collectionId;
  collection = null;
  currentPage = 'sets';
  readOnly = false; //if user has read-only permissions, they can't see certain options
  assessmentGroups = [];
  isImportingQti = false;
  isExportingQti = false;
  currentUser;
  admin = false;
  searchDebounceTimer;
  searchResults = null;
  searchTerm = '';

  constructor(
    public utilitiesService: UtilitiesService,
    public authService: AuthService,
    public userService: UserService,
    public collectionService: CollectionService,
    public assessmentEditService: AssessmentEditService
  ) {
    this.apiToken = this.authService.getInstructorTokenFromStorage();
    this.userService.setApiToken(this.apiToken);
    this.collectionService.setApiToken(this.apiToken);
    this.assessmentEditService.setApiToken(this.apiToken);
  }

  async ngOnInit() {
    this.collectionId = this.getCollectionIdFromUrl();
    await this.getCollection();
    await this.getUser();
  }

    //get the collection and all assessmentgroups/assessments from the DB
  async getCollection() {
    this.utilitiesService.loadingStarted();
    let data;

    try {
      const resp = await this.collectionService.getCollection(this.collectionId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.collection = data.collection;
    this.assessmentGroups = data.assessmentGroups;
    this.readOnly = data.readOnly;
    this.utilitiesService.setTitle('Quick Check - View Set ' + this.collection.name);
    this.utilitiesService.loadingFinished();
  }

  getCollectionIdFromUrl() {
    //get the collection id from the Laravel url, /collection/{id}
    var splitUrl = window.location.href.split('/'),
      lastParam = splitUrl[splitUrl.length - 1],
      splitQuery = lastParam.split('?'), //even if no query string, returns single string in array to grab
      collectionId = splitQuery[0];

    return collectionId;
  }

  async getUser() {
    let data;

    try {
      const resp = await this.userService.getUser();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.currentUser = data.user;
    if (this.currentUser.admin == 'true') {
      this.admin = true;
    }
  }

  initQtiExport() {
    this.isExportingQti = true;
  }

  initQtiImport() {
    this.isImportingQti = true;
  }

  onAssessmentCopy($event) {
    var assessment = $event.assessment;

    this.assessmentGroups.forEach(function(assessmentGroup) {
      if (assessmentGroup.id == assessment.assessment_group_id) {
        assessmentGroup.assessments.push(assessment);
      }
    });
  }

  onAssessmentGroupDeleted($event) {
    var assessmentGroupIndex = $event.assessmentGroupIndex;
    this.assessmentGroups.splice(assessmentGroupIndex, 1);
  }

  onAssessmentGroupSaved($event) {
    var newAssessmentGroup = $event.newAssessmentGroup;
    this.assessmentGroups.push(newAssessmentGroup);
    //focus to newly created assessment group to orient screenreader users
    this.utilitiesService.focusToElement('#heading-group-' + newAssessmentGroup.id);
  }

  onQtiExportCancel($event) {
    this.isExportingQti = false;
    this.utilitiesService.setLtiHeight();
  }

  onQtiImportCancel($event) {
    this.isImportingQti = false;
    this.utilitiesService.setLtiHeight();
  }

  search() {
    this.utilitiesService.loadingStarted();

    if (!this.searchTerm) {
      clearTimeout(this.searchDebounceTimer);
      this.utilitiesService.loadingFinished();
      return;
    }

    //debounce 500ms
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => { this.searchRequest() }, 500);
  }

  async searchRequest()  {

    let data;

    try {
      const resp = await this.collectionService.search(this.collectionId, this.searchTerm);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.searchResults = data.searchResults;
    this.utilitiesService.loadingFinished();
  }
}
