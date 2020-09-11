import { Component, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
import { CollectionService } from '../../../services/collection.service';
import { UtilitiesService } from '../../../services/utilities.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'qc-select-assessment',
  templateUrl: './select-assessment.component.html',
  styleUrls: ['./select-assessment.component.scss']
})
export class SelectAssessmentComponent implements OnInit {
  @Input() assessment;
  @Input() redirectUrl;
  @Input() launchUrlStem;
  @Input() deploymentId;
  @Input() collectionService: CollectionService;
  @Input() utilitiesService: UtilitiesService;
  @ViewChild('form', {static: false}) form: ElementRef;
  jwtValue = new FormControl('');
  jwt;

  constructor() { }

  ngOnInit() {
  }

  async select(assessment) {
    let data;
    const params = {
      'deploymentId': this.deploymentId,
      'launchUrl': this.launchUrlStem + assessment.id,
      'title': assessment.name
    };
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.collectionService.createDeepLinkingJwt(params);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      this.utilitiesService.loadingFinished();
      return false;
    }

    this.jwt = data.jwt;
    this.jwtValue.setValue(this.jwt);
    this.form.nativeElement.submit();
  }

}
