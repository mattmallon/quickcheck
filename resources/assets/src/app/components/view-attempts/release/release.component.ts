import { Component, OnInit, Input } from '@angular/core';
import { ManageService } from '../../../services/manage.service';

@Component({
  selector: 'qc-release',
  templateUrl: './release.component.html',
  styleUrls: ['./release.component.scss']
})
export class ReleaseComponent implements OnInit {
  @Input() assessmentId;
  @Input('existingRelease') release;
  @Input() manageService: ManageService;
  @Input() utilitiesService;

  error;
  success;

  constructor() { }

  ngOnInit() {
  }

  async createRelease() {
  	let data;
		const releaseData = { 'assessmentId': this.assessmentId, 'ltiContextId': this.utilitiesService.contextId };

		try {
			const resp = await this.manageService.createRelease(releaseData);
			data = this.utilitiesService.getResponseData(resp);
		}
		catch (error) {
			this.error = this.utilitiesService.getError(error);
		  this.success = false; //reset if necessary
		  return;
		}

	  this.release = data.release;
		this.error = false; //reset this if it was set previously
		this.success = 'Release successful';
	}

	async rollbackRelease() {
		let data;

		try {
			const resp = await this.manageService.rollbackRelease(this.release.id);
			data = this.utilitiesService.getResponseData(resp);
		}
		catch (error) {
			this.error = this.utilitiesService.getError(error);
		  this.success = false; //reset if necessary
		  return;
		}

		this.release = false; //remove the existing release
		this.success = 'Release successfully rolled back';
		this.error = false; //reset this if it was set previously
	}
}
