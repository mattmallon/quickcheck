import { Component, OnInit, Input } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { CustomActivityService } from '../../../services/custom-activity.service';

@Component({
  selector: 'qc-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  @Input() utilitiesService;
  @Input() userService: UserService;
  @Input() customActivityService: CustomActivityService;
  @Input() collectionData;

  constructor() { }

  ngOnInit() {
    this.utilitiesService.setLtiHeight();
  }

}
