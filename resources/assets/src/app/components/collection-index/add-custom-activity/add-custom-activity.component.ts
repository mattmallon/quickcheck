import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CustomActivityService } from '../../../services/custom-activity.service';

@Component({
  selector: 'qc-add-custom-activity',
  templateUrl: './add-custom-activity.component.html',
  styleUrls: ['./add-custom-activity.component.scss']
})
export class AddCustomActivityComponent implements OnInit {
  @Input() utilitiesService;
  @Input() customActivityService: CustomActivityService;
  @Output() onSave = new EventEmitter();

  customActivityData;
  isOpen = false;

  constructor() { }

  ngOnInit() {
    this.resetData();
  }

  closeForm() {
    this.isOpen = false;
    this.resetData();
  }

  openForm() {
    this.isOpen = true;
  }

  resetData() {
    this.customActivityData = {
      name: null,
      description: null,
      url: null,
      developer: null,
      group_required: 'false'
    };
  }

  async save() {
    this.utilitiesService.loadingStarted();
    let data;

    try {
      const resp = await this.customActivityService.createCustom(this.customActivityData);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    const customActivity = data.customActivity;
    this.utilitiesService.loadingFinished();
    this.closeForm();
    //notify parent to add to list
    this.onSave.emit({ customActivity });
  }

  toggleCustomGroupRequired() {
    if (this.customActivityData.group_required == 'false') {
      this.customActivityData.group_required = 'true';
      return;
    }

    this.customActivityData.group_required = 'false';
  }
}
