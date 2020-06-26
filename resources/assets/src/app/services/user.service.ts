import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  apiToken = null;
  httpOptions = null;

  constructor(private httpClient: HttpClient, private httpService: HttpService) { }

  async addAdmin(data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/user/addAdmin';

    return await this.httpClient.post(path, data, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async checkCookies() {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/checkcookies';

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async establishCookieTrust() {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/establishcookietrust';

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getUser() {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/user';

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async getUserAndPermissions(id) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/user/collection/' + id;

    return await this.httpClient.get(path, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async joinPublicCollection(id, data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/publicmembership/collection/' + id;

    return await this.httpClient.post(path, data, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  async optOutPublicCollection(id, data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/publicmembership/collection/' + id;
    //to pass data in a DELETE request, have to specify it as "body" in options and also specify headers
    const headers = this.httpOptions.headers.append('Content-Type', 'application/json');
    const options = { headers, body: data };

    return await this.httpClient.delete(path, options)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  setApiToken(apiToken) {
    this.apiToken = apiToken;
    this.httpOptions = {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.apiToken}`})
    };
  }

  async validateUser(data) {
    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/user/validate';

    return await this.httpClient.post(path, data, this.httpOptions)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }
}
