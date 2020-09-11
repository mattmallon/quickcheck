import { Component, OnInit, Input } from '@angular/core';
import { CollectionService } from '../../../services/collection.service';
import { UtilitiesService } from '../../../services/utilities.service';

@Component({
  selector: 'qc-select-collection-panel',
  templateUrl: './select-collection-panel.component.html',
  styleUrls: ['./select-collection-panel.component.scss']
})
export class SelectCollectionPanelComponent implements OnInit {
  @Input() collection;
  @Input() membership;
  @Input() redirectUrl;
  @Input() launchUrlStem;
  @Input() deploymentId;
  @Input() collectionService: CollectionService;
  @Input() utilitiesService: UtilitiesService;

  constructor() { }

  ngOnInit() {
  }
}
