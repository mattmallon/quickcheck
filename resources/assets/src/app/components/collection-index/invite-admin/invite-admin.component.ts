import { Component, OnInit, Input } from '@angular/core';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'qc-invite-admin',
  templateUrl: './invite-admin.component.html',
  styleUrls: ['./invite-admin.component.scss']
})
export class InviteAdminComponent implements OnInit {
  @Input() utilitiesService;
  @Input() userService: UserService;

  isEnteringUsername = false;
  formOpen = false;
  username = null;
  validationError = false;
  saveError = false;
  saveErrorReason = null;
  userAdded = false;
  userValidated = false;
  validatedUser = null;

  constructor() { }

  ngOnInit() {
  }

  close() {
    this.formOpen = false;
  }

  openForm() {
    this.reset();
    this.formOpen = true;
  }

  reset() {
    this.username = null;
    this.validationError = false;
    this.saveError = false;
    this.userValidated = false;
    this.userAdded = false;
    this.isEnteringUsername = true;
  }

  async saveUser() {
    var user = {'username': this.username};
    this.saveError = false; //reset if set previously

    try {
      await this.userService.addAdmin(user);
      this.userAdded = true;
      this.utilitiesService.loadingFinished();
    }
    catch (error) {
      this.saveErrorReason = this.utilitiesService.getError(error);
      this.saveError = true;
      this.utilitiesService.loadingFinished();
    }
  }

  async validateUser() {
    let resp;
    let data;
    this.utilitiesService.loadingStarted();
    this.validationError = false; //reset if set previously

    try {
      resp = await this.userService.validateUser({'username': this.username});
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.validationError = true;
      this.utilitiesService.loadingFinished();
    }

    if (this.utilitiesService.isSuccessResponse(resp)) {
      this.validatedUser = data.user;
      this.userValidated = true;
      await this.saveUser();
    }
    else {
      this.validationError = true;
      this.utilitiesService.loadingFinished();
    }
  }

}
