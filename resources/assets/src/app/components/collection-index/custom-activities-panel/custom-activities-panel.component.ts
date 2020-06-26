import { Component, OnInit, Input } from '@angular/core';
import { CustomActivityService } from '../../../services/custom-activity.service';

@Component({
  selector: 'qc-custom-activities-panel',
  templateUrl: './custom-activities-panel.component.html',
  styleUrls: ['./custom-activities-panel.component.scss']
})
export class CustomActivitiesPanelComponent implements OnInit {
  @Input() utilitiesService;
  @Input() customActivityService: CustomActivityService;

  customActivities = [];
  isOpen = false;
  loading = false;

  constructor() { }

  ngOnInit() {
  }

  close() {
    this.isOpen = false;
  }

  onDelete($event) {
    var customActivityIndex = $event.customActivityIndex;
    this.customActivities.splice(customActivityIndex, 1);
  }

  onSave($event) {
    var customActivity = $event.customActivity;
    this.customActivities.push(customActivity);
    this.utilitiesService.focusToElement('#qc-custom-activity-' + customActivity.id);
  }

  async open() {
    this.loading = true;
    this.isOpen = true;
    let data;

    try {
      const resp = await this.customActivityService.getCustomActivities();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.customActivities = data.customActivities;
    this.loading = false;
  }

}
