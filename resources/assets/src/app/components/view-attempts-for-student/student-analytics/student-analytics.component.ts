import { Component, OnInit, Input } from '@angular/core';
import { ManageService } from '../../../services/manage.service';

@Component({
  selector: 'qc-student-analytics',
  templateUrl: './student-analytics.component.html',
  styleUrls: ['./student-analytics.component.scss']
})
export class StudentAnalyticsComponent implements OnInit {
  @Input() studentId;
  @Input() studentName;
  @Input() manageService: ManageService;
  @Input() utilitiesService;

  apiToken = null; //used for CSV downloads, when sending POST request to new tab
  averageRetries = 0;
  averageScore = 0;
  averageTime = 0;
  averageTimeBeforeDueDate = 0;
  averageTimeAfterDueDate = 0;
  averageTimeUntilDueDate = 0;
  totalAttempts = 0;
  totalQuestions = 0;
  totalTime = 0;
  totalTimeBeforeDueDate = 0;
  totalTimeAfterDueDate = 0;

  constructor() { }

  async ngOnInit() {
    this.apiToken = this.manageService.apiToken;
    this.getAnalytics();
  }

  async getAnalytics() {
    let data;
    this.utilitiesService.loadingStarted();

    try {
      const resp = await this.manageService.getStudentAnalytics(this.utilitiesService.contextId, this.studentId);
      data = this.utilitiesService.getResponseData(resp);
    }
    catch(error) {
      this.utilitiesService.showError(error);
      return;
    }

    this.totalAttempts = data.studentAnalytics.totalAttempts;
    this.averageScore = data.studentAnalytics.averageScore;
    this.totalQuestions = data.studentAnalytics.totalQuestions;
    this.averageRetries = data.studentAnalytics.averageRetries;
    this.totalTime = data.studentAnalytics.totalTime;
    this.totalTimeBeforeDueDate = data.studentAnalytics.totalTimeBeforeDueDate;
    this.totalTimeAfterDueDate = data.studentAnalytics.totalTimeAfterDueDate;
    this.averageTime = data.studentAnalytics.averageTime;
    this.averageTimeBeforeDueDate = data.studentAnalytics.averageTimeBeforeDueDate;
    this.averageTimeAfterDueDate = data.studentAnalytics.averageTimeAfterDueDate;
    this.averageTimeUntilDueDate = data.studentAnalytics.averageTimeUntilDueDate;
    this.utilitiesService.loadingFinished();
  }
}
