import { Component, OnInit, Input } from '@angular/core';
import { CollectionService } from '../../../services/collection.service';

@Component({
  selector: 'qc-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss']
})
export class FeaturesComponent implements OnInit {
  @Input() collectionId;
  @Input() readOnly;
  @Input() collectionService: CollectionService;
  @Input() utilitiesService;

  collectionFeatures = [];
  showFeatures = false;

  constructor() { }

  async ngOnInit() {
    let data;

    try {
      const resp = await this.collectionService.getCollectionFeatures(this.collectionId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.collectionFeatures = data.features;
  }

   toggleShowFeatures() {
    this.showFeatures = !this.showFeatures;
    this.utilitiesService.setLtiHeight();
  }

  async toggleFeature(collectionFeature) {
    if (collectionFeature.enabled == 'true') {
      collectionFeature.enabled = 'false';
    } else {
      collectionFeature.enabled = 'true';
    }
    collectionFeature.loading = true; //disable input while saving

    try {
      await this.collectionService.updateFeature(collectionFeature.id, { 'collectionFeature': collectionFeature });
    }
    catch(error) {
      this.utilitiesService.showError(error);
    }
  }
}
