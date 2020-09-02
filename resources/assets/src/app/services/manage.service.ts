import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class ManageService {

  apiToken = null;
  httpOptions = null;

  constructor(private httpClient: HttpClient, private httpService: HttpService) { }

  async autoGrade(data) {
    const timeoutLength = this.httpService.getCrazyLongTimeout();
    const path = this.httpService.getApiRoute() + '/attempts/autograde';

    return await this.httpClient.post(path, data, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async createRelease(data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/release';

    return await this.httpClient.post(path, data, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getAttemptsAndResponses(assessmentId, assignmentId, contextId) {
    const timeoutLength = this.httpService.getCrazyLongTimeout();
    let path = this.httpService.getApiRoute() + '/assessment/' + assessmentId + '/attempts/context/' + contextId;
    if (assignmentId) {
      path += ('/' + assignmentId);
    }

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getAttemptsForStudent(contextId, studentId) {
    const timeoutLength = this.httpService.getLongTimeout();
    const path = this.httpService.getApiRoute() + '/attempts/' + contextId + '/student/'  + studentId;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getAttemptSubmissions(assessmentId, assignmentId, contextId) {
    const timeoutLength = this.httpService.getCrazyLongTimeout();
    let path = this.httpService.getApiRoute() + '/assessment/' + assessmentId + '/attempts/context/' + contextId + '/submissions';
    if (assignmentId) {
      path += ('/' + assignmentId);
    }

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getOverview(contextId) {
    const timeoutLength = this.httpService.getLongTimeout();
    const path = this.httpService.getApiRoute() + '/attempts/' + contextId;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getReleases(contextId) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/release/' + contextId;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getResponseAnalytics(id, contextId, assignmentId = null) {
    const timeoutLength = this.httpService.getCrazyLongTimeout();
    let path = this.httpService.getApiRoute() + '/responses/analytics/assessment/' + id + '/context/' + contextId;

    if (assignmentId) {
      path += ('/' + assignmentId);
    }

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getStudentsByContext(contextId) {
    const timeoutLength = this.httpService.getLongTimeout();
    const path = this.httpService.getApiRoute() + '/students/context/' + contextId;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getStudentAnalytics(contextId, studentId) {
    const timeoutLength = this.httpService.getLongTimeout();
    const path = this.httpService.getApiRoute() + '/analytics/context/' + contextId + '/student/' + studentId;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getStudentAttempts(assessmentId, contextId) {
    const timeoutLength = this.httpService.getMediumTimeout();
    const path = this.httpService.getApiRoute() + '/assessment/' + assessmentId + '/attempt/' + contextId;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getStudentResponses(id) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/attempt/' + id + '/responses';

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getStudentSubmission(assessmentId, contextId, studentId) {
    const timeoutLength = this.httpService.getLongTimeout();
    const path = this.httpService.getApiRoute() + '/assessment/' + assessmentId + '/attempts/'  + contextId + '/submission/' + studentId;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getUsersInCourse(id) {
    const timeoutLength = this.httpService.getLongTimeout();
    const path = this.httpService.getApiRoute() + '/users/course/' + id;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async rollbackRelease(id) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/release/' + id;

    return await this.httpClient.delete(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  setApiToken(apiToken) {
    this.apiToken = apiToken;
    this.httpOptions = {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.apiToken}`})
    };
  }

  async submitGrade(data) {
    const timeoutLength = this.httpService.getMediumTimeout();
    const path = this.httpService.getApiRoute() + '/attempts/gradepassback';

    return await this.httpClient.post(path, data, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }
}
