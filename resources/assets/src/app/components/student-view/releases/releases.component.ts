import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ManageService } from '../../../services/manage.service';

@Component({
  selector: 'qc-releases',
  templateUrl: './releases.component.html',
  styleUrls: ['./releases.component.scss']
})
export class ReleasesComponent implements OnInit {
  @Input() utilitiesService;
  @Input() manageService: ManageService;
  @Output() onViewAttempts = new EventEmitter();

  releases = [];
  search = {'assessmentName': ''}; //for searching through attempts

  constructor() { }

  async ngOnInit() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.manageService.getReleases(this.utilitiesService.contextId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.releases = data.releases;
    this.utilitiesService.loadingFinished();
  }


  isSubstringNotFound(string1, string2) {
    if (string1.toLowerCase().indexOf(string2.toLowerCase()) === -1) {
      return true;
    }

    return false;
  }

  viewAttempts(assessment) {
    this.onViewAttempts.emit({ assessment });
  }
}
