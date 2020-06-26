import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CustomActivityService } from '../../../services/custom-activity.service';
import * as cloneDeep from 'lodash/cloneDeep';

@Component({
  selector: 'qc-custom-activity',
  templateUrl: './custom-activity.component.html',
  styleUrls: ['./custom-activity.component.scss']
})
export class CustomActivityComponent implements OnInit {
  @Input() customActivity;
  @Input() index;
  @Output() onDelete = new EventEmitter();
  @Input() utilitiesService;
  @Input() customActivityService: CustomActivityService;

  editingData; //copy to separate object so if user cancels edit, data is intact
  isEditing = false;

  constructor() { }

  ngOnInit() {
    //accordion closed by default
    this.customActivity.closed = true;
    this.utilitiesService.setLtiHeight();
  }

  cancelEdit() {
    this.isEditing = false;
  }

  confirmDelete() {
    //don't use confirm alert in regression testing, it blows up protractor
    if (this.utilitiesService.isRegressionEnv()) {
      return true;
    }

    return confirm('Are you sure you want to delete this custom activity?');
  }

  async deleteCustomActivity($event) {
    this.stopAccordion($event); //prevent accordion from getting toggled by button click
    if (!this.confirmDelete()) {
      return false;
    }

    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.customActivityService.deleteCustom(this.customActivity.id);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.utilitiesService.loadingFinished();
    this.onDelete.emit({ customActivityIndex: this.index });
  }

  edit($event) {
    //prevent accordion from getting toggled by button click if already open
    if (!this.customActivity.closed) {
      this.stopAccordion($event);
    }
    //copy model, in case user makes updates and then cancels, so that existing model doesn't change on the page
    this.editingData = cloneDeep(this.customActivity);
    this.isEditing = true;
  }

  isGroupRequired() {
    if (this.customActivity.group_required == 'true') {
      return true;
    }

    return false;
  }

  stopAccordion($event) {
    $event.stopPropagation();
  }

  toggleAccordion() {
    this.customActivity.closed = !this.customActivity.closed;
    this.utilitiesService.setLtiHeight();
  }

  toggleCustomGroupRequired() {
    if (this.editingData.group_required == 'true') {
      this.editingData.group_required = 'false';
    }
    else {
      this.editingData.group_required = 'true';
    }
  }

  async update() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.customActivityService.updateCustom(this.customActivity.id, this.editingData);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.customActivity = data.customActivity;
    this.cancelEdit(); //close form
    this.utilitiesService.loadingFinished();
  }
}
