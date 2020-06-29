import { Component, OnInit, Input } from '@angular/core';
import { CustomActivityService } from '../../../services/custom-activity.service';

@Component({
  selector: 'qc-custom-activity-selection',
  templateUrl: './custom-activity-selection.component.html',
  styleUrls: ['./custom-activity-selection.component.scss']
})
export class CustomActivitySelectionComponent implements OnInit {
  @Input() admin;
  @Input() assessment;
  @Input() customActivity;
  @Input() customActivityAdded;
  @Input() customActivityService: CustomActivityService;
  @Input() readOnly;
  @Input() utilitiesService;

  customActivities = [];
  saved = false;

  constructor() { }

  async ngOnInit() {
    this.utilitiesService.setLtiHeight();
    if (!this.admin) {
      return;
    }

    //admins can select custom activity from list; instructor can only view
    //what has already been selected by an admin
    await this.getCustomActivities();
  }

  addCustomActivity() {
    this.customActivityAdded = true;
    //if user saved and is adding/editing more data, remove the success box
    this.saved = false;
  }

  async getCustomActivities() {
    try {
      const resp = await this.customActivityService.getCustomActivities();
      const data = this.utilitiesService.getResponseData(resp);
      this.customActivities = data.customActivities;
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }
  }

  removeCustomActivity() {
    this.customActivityAdded = false;
    delete this.assessment.custom_activity_id;
    //if user saved and is adding/editing more data, remove the success box
    this.saved = false;
  }

  //populate the url/developer info whenever a custom activity option is selected, to give user more info
  selectCustomActivity(id) {
    for (let activity of this.customActivities) {
      if (activity.id == id) {
        this.customActivity = activity;
        //if user saved and is adding/editing more data, remove the success box
        this.saved = false;
      }
    }
  }
}
