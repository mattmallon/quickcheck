import { Component, OnInit } from '@angular/core';
import { CollectionService } from '../../services/collection.service';
import { UserService } from '../../services/user.service';
import { UtilitiesService } from '../../services/utilities.service';
import { AuthService } from '../../services/auth.service';
import { CustomActivityService } from '../../services/custom-activity.service';

@Component({
  selector: 'qc-collection-index',
  templateUrl: './collection-index.component.html',
  styleUrls: ['./collection-index.component.scss']
})
export class CollectionIndexComponent implements OnInit {
  admin = false;
  adminCollectionData = {
    'viewAll': false,
    'collections': []
  };
  apiToken = null;
  currentPage = 'sets';
  searchedMemberships = [];
  memberships = [];
  publicCollectionsVisible = false;
  search = {'collectionName': ''}; //for searching in collection list
  user = {};

  constructor(
    public utilitiesService: UtilitiesService,
    public userService: UserService,
    public collectionService: CollectionService,
    public authService: AuthService,
    public customActivityService: CustomActivityService
  ) {
    this.apiToken = this.authService.getInstructorTokenFromStorage();
    this.userService.setApiToken(this.apiToken);
    this.collectionService.setApiToken(this.apiToken);
    this.customActivityService.setApiToken(this.apiToken);
  }

  async ngOnInit() {
    this.utilitiesService.setTitle('Quick Check sets');
    await this.getCollections();
  }

  async getCollections(focusToCollectionElement = null) {
    let data;
    this.utilitiesService.loadingStarted();
    this.memberships = []; //reset memberships before loading anew

    try {
      const resp = await this.collectionService.getMemberships();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.memberships = data.memberships;
    this.searchedMemberships = this.memberships;
    this.utilitiesService.loadingFinished(focusToCollectionElement);
    await this.getUser(); //display admin features if an admin
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

    this.user = data.user;
    if (data.user.admin == 'true') {
      this.admin = true;
      //set LTI height after new panels and such have been added
      this.utilitiesService.setLtiHeight();
    }
  }

  isSubstringNotFound(string1, string2) {
    if (string1.toLowerCase().indexOf(string2.toLowerCase()) === -1) {
      return true;
    }

    return false;
  }

  onCollectionAdded($event) {
    var membership = $event.membership,
      focusElement = '#collection-header-' + membership.collection.id;

    this.memberships.push(membership);
    //if an admin, include in the list of all collections in the system
    if (this.adminCollectionData.collections) {
      this.adminCollectionData.collections.push(membership);
    }

    this.utilitiesService.loadingFinished();
    this.utilitiesService.focusToElement(focusElement); //focus for screenreaders
  }

  get searchedAdminCollections() {
    const searchTerm = this.search.collectionName.toLowerCase();
    const searchedAdminCollections = [];

      if (!searchTerm) {
        return this.adminCollectionData.collections;
      }

      for (let collection of this.adminCollectionData.collections) {
        if (collection.name.toLowerCase().indexOf(searchTerm) > -1) {
          searchedAdminCollections.push(collection);
        }
      }

      return searchedAdminCollections;
  }

  searchUpdated() {
    const searchTerm = this.search.collectionName.toLowerCase();
    this.searchedMemberships = [];

    if (!searchTerm) {
      this.searchedMemberships = this.memberships;
      return;
    }

    for (let membership of this.memberships) {
      if (membership.collection.name.toLowerCase().indexOf(searchTerm) > -1) {
        this.searchedMemberships.push(membership);
      }
    }
  }

  togglePublicCollectionVisibility() {
    this.publicCollectionsVisible = !this.publicCollectionsVisible;
    this.utilitiesService.setLtiHeight();
  }
}
