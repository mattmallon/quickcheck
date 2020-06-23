import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class CustomActivityService {

  apiToken = null;

  constructor(private httpClient: HttpClient, private httpService: HttpService) { }

  async getCustomActivities() {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/customActivities';

    return await this.httpClient.get(path)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async createCustom(data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/customActivity';

    return await this.httpClient.post(path, data)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async updateCustom(id, data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/customActivity/' + id;

    return await this.httpClient.put(path, data)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async deleteCustom(id) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/customActivity/' + id;

    return await this.httpClient.delete(path)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  setApiToken(apiToken) {
    this.apiToken = apiToken;
  }
}
