import { Component, OnInit, Input } from '@angular/core';
import { CollectionService } from '../../../services/collection.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'qc-public-collections',
  templateUrl: './public-collections.component.html',
  styleUrls: ['./public-collections.component.scss']
})
export class PublicCollectionsComponent implements OnInit {
  @Input() user;
  @Input() collectionService: CollectionService;
  @Input() userService: UserService;
  @Input() utilitiesService;

  publicCollections = [];

  constructor() { }

  async ngOnInit() {
    try {
      const resp = await this.collectionService.getPublicCollections();
      const data = this.utilitiesService.getResponseData(resp);
      this.publicCollections = data.publicCollections;
    }
    catch (error) {
      this.utilitiesService.showError(error);
    }
  }

  async joinPublicCollection(collection) {
    this.utilitiesService.loadingStarted();
    let data;

    try {
      const resp = await this.userService.joinPublicCollection(collection.id, this.user);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    collection.user_membership = data.membership;
    const focusElement = '#goto-collection-' + collection.id;
    this.utilitiesService.loadingFinished(focusElement);
  }

  async optOutPublicCollection(collection) {
    this.utilitiesService.loadingStarted();
    let data;

    try {
      const resp = await this.userService.optOutPublicCollection(collection.id, this.user);
      this.utilitiesService.loadingFinished();
      collection.user_membership = false;
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }
  }

}
