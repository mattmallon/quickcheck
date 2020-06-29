import { Component, OnInit, Input } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';
import { ManageService } from '../../../services/manage.service';

@Component({
  selector: 'qc-quiz-analytics',
  templateUrl: './quiz-analytics.component.html',
  styleUrls: ['./quiz-analytics.component.scss']
})
export class QuizAnalyticsComponent implements OnInit {
  @Input() assessment;
  @Input() assignmentId;
  @Input() manageService: ManageService;
  @Input() utilitiesService : UtilitiesService;

  analytics = null;
  apiToken = null; //used for CSV downloads, when POSTing form to new tab
  avgAttempts;
  avgTime;
  medianScore;
  numAttempts;
  questions;

  constructor() { }

  async ngOnInit() {
    this.apiToken = this.manageService.apiToken;
    await this.getAnalytics();
  }

  async getAnalytics() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.manageService.getResponseAnalytics(this.assessment.id, this.utilitiesService.contextId, this.assignmentId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch (error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.analytics = data.analytics;
    this.numAttempts = this.analytics.assessmentAnalytics.numAttempts;
    this.medianScore = this.analytics.assessmentAnalytics.medianScore;
    this.avgAttempts = this.analytics.assessmentAnalytics.avgAttempts;
    this.avgTime = this.analytics.assessmentAnalytics.avgTime;
    this.questions = this.analytics.questionAnalytics;
    this.utilitiesService.loadingFinished();
  }

  isCustom() {
    return this.assessment.custom_activity_id;
  }
}
