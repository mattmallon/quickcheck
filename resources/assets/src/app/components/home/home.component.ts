import { Component, OnInit } from '@angular/core';
import { UtilitiesService } from '../../services/utilities.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { CollectionService } from '../../services/collection.service';


@Component({
  selector: 'qc-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  apiToken = null;
  currentPage = 'home';
  isAddingAssessment = false;
  sessionExpired = false;

  constructor(
    public utilitiesService: UtilitiesService,
    public userService: UserService,
    public authService: AuthService,
    public collectionService: CollectionService
    ) { }

  async ngOnInit() {
    this.utilitiesService.setTitle('Quick Check - Home');
    const existingApiToken = this.authService.getInstructorTokenFromStorage();

    //we generally should refresh the token every time there is an LTI launch to update the expiration
    //value and make sure the user doesn't lose their place in the middle of things if an active session.
    //however, if outside of an iframe (either due to CAS or popping open into a new tab), we don't have
    //a new launch to re-authenticate using a fresh nonce, etc., so use an existing token if we have one.
    if (!this.utilitiesService.isInIframe() && existingApiToken) {
      this.setApiTokens(existingApiToken);
      return;
    }

    let data;

    try {
      const resp = await this.authService.authenticate();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
    }

    if (data) {
      this.setApiTokens(data.apiToken);
    }

    this.utilitiesService.setLtiHeight();
  }

  addAssessment() {
    this.isAddingAssessment = true;
  }

  cancelAdd($event) {
    this.isAddingAssessment = false;
  }

  setApiTokens(apiToken) {
    this.apiToken = apiToken;
    this.authService.storeInstructorToken(this.apiToken);
    this.collectionService.setApiToken(this.apiToken);
  }
}
