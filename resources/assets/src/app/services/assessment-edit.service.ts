import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class AssessmentEditService {

  apiToken = null;
  httpOptions = null;

  constructor(private httpClient: HttpClient, private httpService: HttpService) { }

  async deleteAssessment(id) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/assessment/' + id;

    return await this.httpClient.delete(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getAssessment(id) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/assessment/' + id;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async saveAssessment(data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/assessment';

    return await this.httpClient.post(path, data, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  setApiToken(apiToken) {
    this.apiToken = apiToken;
    this.httpOptions = {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.apiToken}`})
    };
  }

  async updateAssessment(id, data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/assessment/' + id;

    return await this.httpClient.put(path, data, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }
}
