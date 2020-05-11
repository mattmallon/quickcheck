import { Component, OnInit } from '@angular/core';
import { UtilitiesService } from '../../services/utilities.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'qc-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  currentPage = 'home';
  isAddingAssessment = false;
  sessionExpired = false;

  constructor(public utilitiesService: UtilitiesService, public userService: UserService) { }

  async ngOnInit() {
    this.utilitiesService.setTitle('Quick Check - Home');
    this.utilitiesService.loadingStarted();

    //in Safari, if third party cookies are disabled, the sameSite=none policy that works in Chrome
    //unfortunately does not work on Safari 13 and earlier in Mojave and earlier versions of mac OS.
    //in this case, we check to see if a session exists immediately after the LTI launch, and if not,
    //we can assume cookies are disabled and require the user to open in a new tab to establish first
    //party trust. should only be necessary the first time the user accesses the site.
    try {
      await this.userService.checkCookies();
      //if cookies are not working, the expired session error message will show up and
      //create confusion; only check for expired session if we know cookies are working.
      this.checkForExpiredSession();
    }
    catch (error) {
      const errorMessage = this.utilitiesService.getCookieErrorMsg();
      this.utilitiesService.setError(errorMessage);
    }

    this.utilitiesService.loadingFinished();
    this.utilitiesService.setLtiHeight();
  }

  addAssessment() {
    this.isAddingAssessment = true;
  }

  cancelAdd($event) {
    this.isAddingAssessment = false;
  }

  //if the user ran an API call that resulted in an expired session warning from the back-end, then
  //they are redirected to the home page with a query param set to let us know to show an expired
  //session warning
  checkForExpiredSession() {
    this.sessionExpired = this.utilitiesService.isSessionExpired();
  }
}
