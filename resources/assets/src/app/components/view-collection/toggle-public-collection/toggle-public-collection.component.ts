import { Component, OnInit, Input } from '@angular/core';
import { CollectionService } from '../../../services/collection.service';

@Component({
  selector: 'qc-toggle-public-collection',
  templateUrl: './toggle-public-collection.component.html',
  styleUrls: ['./toggle-public-collection.component.scss']
})
export class TogglePublicCollectionComponent implements OnInit {
  @Input() collection;
  @Input() collectionService: CollectionService;
  @Input() utilitiesService;

  constructor() { }

  ngOnInit() {
  }

  confirmToggle() {
    var msg = '';

    //prevent Protractor from freaking out from js alerts by accepting in regression env
    if (this.utilitiesService.isRegressionEnv()) {
      return true;
    }
    else if (this.isPublicCollection()) {
      msg = 'Are you sure you want this set to no longer be public? If users ' +
        'have already embedded quick checks from this collection, they will ' +
        'still be available. Future embeds will be disabled.';
      return confirm(msg);
    }
    else {
      msg = 'Are you sure you want to make this set public? All users in ' +
        'the system will be able to embed quick checks that are in this set.';
      return confirm(msg);
    }
  }

  isPublicCollection() {
    if (this.collection.public_collection === 'true') {
      return true;
    }

    return false;
  }

  setPrivate() {
    this.collection.public_collection = 'false';
  }

  setPublic() {
    this.collection.public_collection = 'true';
  }

  async togglePublicCollection() {
    if (!this.confirmToggle()) {
      return;
    }

    if (this.isPublicCollection()) {
      this.setPrivate();
    }
    else {
      this.setPublic();
    }

    await this.updateCollection();
  }

  async updateCollection() {
    try {
      await this.collectionService.togglePublic(this.collection);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }
  }
}
