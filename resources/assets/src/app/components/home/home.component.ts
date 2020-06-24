import { Component, OnInit } from '@angular/core';
import { UtilitiesService } from '../../services/utilities.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

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

  constructor(public utilitiesService: UtilitiesService, public userService: UserService, public authService: AuthService) { }

  async ngOnInit() {
    this.utilitiesService.setTitle('Quick Check - Home');

    let data;

    try {
      const resp = await this.authService.authenticate();
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
    }

    if (data) {
      this.apiToken = data.apiToken;
      this.authService.storeInstructorToken(this.apiToken);
    }

    this.utilitiesService.setLtiHeight();
  }

  addAssessment() {
    this.isAddingAssessment = true;
  }

  cancelAdd($event) {
    this.isAddingAssessment = false;
  }
}
