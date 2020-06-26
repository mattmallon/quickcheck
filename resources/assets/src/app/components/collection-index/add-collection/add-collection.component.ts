import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CollectionService } from '../../../services/collection.service';

@Component({
  selector: 'qc-add-collection',
  templateUrl: './add-collection.component.html',
  styleUrls: ['./add-collection.component.scss']
})
export class AddCollectionComponent implements OnInit {
  @Input() utilitiesService;
  @Input() collectionService: CollectionService;
  @Output() onSave = new EventEmitter();

  isAddingCollection = false;
  newCollection = { name: null, description: null };

  constructor() { }

  ngOnInit() {
  }

  addCollection() {
    this.isAddingCollection = true;
    this.utilitiesService.setLtiHeight();
    this.utilitiesService.focusToElement('#collection-name');
  }

  collectionAddClose() {
    this.isAddingCollection = false;
  }

  async saveNewCollection() {
    let data;
    let membership;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.collectionService.createCollection(this.newCollection);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    membership = data.membership;
    this.isAddingCollection = false;

    //notify parent to add to list of memberships
    this.onSave.emit({ membership });

    this.utilitiesService.loadingFinished();
  }

}
