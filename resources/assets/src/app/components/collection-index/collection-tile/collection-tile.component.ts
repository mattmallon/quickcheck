import { Component, Input, OnInit } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';
import { CollectionService } from '../../../services/collection.service';
import * as cloneDeep from 'lodash/cloneDeep';

@Component({
  selector: 'qc-collection-tile',
  templateUrl: './collection-tile.component.html',
  styleUrls: ['./collection-tile.component.scss']
})
export class CollectionTileComponent implements OnInit {
  @Input() collection;
  @Input() membership;
  @Input() index;
  @Input() utilitiesService: UtilitiesService;
  @Input() collectionService: CollectionService;
  isReadOnly = false;

  constructor() { }

  ngOnInit() {
    this.utilitiesService.setLtiHeight();

    //membership included for normal users but not for admins
    if (this.membership) {
      this.isReadOnly = this.membership.read_only ? true : false;
    }
  }

    editCollection () {
      //copy model, in case user makes updates and then cancels, so that existing model doesn't change on the page
      let editingData = cloneDeep(this.collection);
      this.collection.editingData = editingData;
      this.collection.isEditing = true;

      //focus on header to orient screenreader user to the proper location
      var element = '#edit-collection-header-' + this.collection.id;
      this.utilitiesService.focusToElement(element);
  }

  collectionEditingClose () {
    this.collection.isEditing = false;
  }

  async deleteCollection() {
    let data;

    if (!confirm('Are you sure you want to delete this set and all quick checks associated with it? This action cannot be undone.')) {
      return;
    }

    this.utilitiesService.loadingStarted();

    try {
      await this.collectionService.deleteCollection(this.collection.id);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.utilitiesService.loadingFinished();
    this.collection = null; //trigger ng-if on parent to remove DOM element
  }

  async updateCollection() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.collectionService.updateCollection(this.collection.id, this.collection.editingData);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.collection = data.collection;
    this.utilitiesService.loadingFinished();
  }
}
