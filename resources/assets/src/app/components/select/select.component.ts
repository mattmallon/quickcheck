import { Component, OnInit } from '@angular/core';
import { CollectionService } from '../../services/collection.service';
import { UserService } from '../../services/user.service';
import { UtilitiesService } from '../../services/utilities.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'qc-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent implements OnInit {
  apiToken = null;
  user;
  admin = false;
  memberships = [];
  assessments = [];
  launchUrlStem;
  redirectUrl;
  search = {
    searchText: '',
    searchActivated: false,
    searchResults: []
  };
  adminCollectionData = {
    'viewAll': false,
    'collections': []
  };

  constructor(
  public utilitiesService: UtilitiesService,
  public authService: AuthService,
  private userService: UserService,
  private collectionService: CollectionService
  ) {
    this.apiToken = this.authService.getInstructorTokenFromStorage();
    this.userService.setApiToken(this.apiToken);
    this.collectionService.setApiToken(this.apiToken);
  }

  async ngOnInit() {
    this.utilitiesService.setTitle('Quick Check - Select');
    this.launchUrlStem = this.utilitiesService.getQueryParam('launchUrlStem');
    this.redirectUrl = this.utilitiesService.getQueryParam('redirectUrl');

    //if this is the user's first LTI launch recently, authenticate to retrieve API token
    if (!this.apiToken) {
      let data;

      try {
        const resp = await this.authService.authenticate();
        data = this.utilitiesService.getResponseData(resp);
      }
      catch (error) {
        this.utilitiesService.showError(error);
      }

      if (data) {
        this.apiToken = data.apiToken;
        this.authService.storeInstructorToken(this.apiToken);
        this.userService.setApiToken(this.apiToken);
        this.collectionService.setApiToken(this.apiToken);
      }
    }

    await this.getMemberships();
  }

  clearSearch() {
    this.search.searchText = '';
    this.updateSearch();
  }

  createContentItemJson(assessment) {
    const contentItemJson = {
      '@context': 'http://purl.imsglobal.org/ctx/lti/v1/ContentItem',
      '@graph': [
        {
          '@type': 'LtiLinkItem',
          '@id': this.launchUrlStem + assessment.id,
          'url': this.launchUrlStem + assessment.id,
          'title': assessment.name,
          'text': 'Quick Check',
          'mediaType': 'application/vnd.ims.lti.v1.ltilink',
          'placementAdvice': {
            'presentationDocumentTarget': 'frame'
          }
        }
      ]
    };

    return JSON.stringify(contentItemJson);
  }

  //grab the assessments out of the collections/assessment groups to make search easier
  //differentiate between personal memberships vs. all collections for admins
  getAssessments() {
    var collections,
      assessments = [];

    if (this.adminCollectionData.viewAll) {
      collections = this.adminCollectionData.collections;
    }
    else {
      collections = this.memberships.map(function(membership) {
        return membership.collection;
      });
    }

    for (let collection of collections) {
      for (let assessmentGroup of collection.assessment_groups) {
        for (let assessment of assessmentGroup.assessments) {
          assessments.push(assessment);
        }
      }
    }

    return assessments;
  }

  async getMemberships() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.collectionService.getMembershipsWithAssessments();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.memberships = data.memberships;
    this.utilitiesService.loadingFinished();
    await this.getUser(); //display admin features if an admin
  }

  async getUser() {
    let data;

    try {
      const resp = await this.userService.getUser();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return false;
    }

    this.user = data.user;
    if (this.user.admin == 'true') {
      this.admin = true;
    }
  }

  runSearch() {
    var assessments = this.getAssessments();
    this.search.searchResults = [];

    for (let assessment of assessments) {
      if (assessment.name.toLowerCase().indexOf(this.search.searchText) !== -1) {
        this.search.searchResults.push(assessment);
      }
    }
  }

  updateSearch() {
    if (this.search.searchText === '') {
      this.search.searchActivated = false;
      this.search.searchResults = [];
    }
    else {
      this.search.searchText = this.search.searchText.toLowerCase();
      this.runSearch();
      this.search.searchActivated = true;
    }
  }
}
