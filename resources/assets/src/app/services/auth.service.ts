import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { HttpService } from './http.service';
import * as moment from 'moment-timezone';
import { ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  apiToken = null;
  instructorStorageExpiresKey = 'iu-eds-qc-instructor-token-expires';
  instructorStorageTokenKey = 'iu-eds-qc-instructor-token';
  studentStorageTokenKey = 'iu-eds-qc-student-token';

  constructor(private httpClient: HttpClient, private httpService: HttpService, private route: ActivatedRoute) { }

  async authenticate() {
    const queryParams = this.route.snapshot.queryParamMap;
    const role = queryParams.get('role');
    const userId = queryParams.get('userId');
    const nonce = queryParams.get('nonce');

    if (!role || !userId || !nonce) {
      throw new Error('Authentication failed, required parameters not present.');
    }

    const timeoutLength = this.httpService.getDefaultTimeout();
    const path = this.httpService.getApiRoute() + '/authenticate';
    const params = { role, userId, nonce };

    return await this.httpClient.post(path, params)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  getInstructorTokenFromStorage() {
    const storedValue = localStorage.getItem(this.instructorStorageTokenKey);
    if (!storedValue) {
      return null;
    }

    const expiresAtValue = localStorage.getItem(this.instructorStorageExpiresKey);
    if (!expiresAtValue) { //shouldn't happen, but just in case
      return null;
    }

    const expiresAtMoment = moment(expiresAtValue);
    const now = moment();

    if (expiresAtMoment.isSameOrBefore(now)) {
      return null;
    }

    return storedValue;
  }

  getStudentTokenFromStorage() {
    return sessionStorage.getItem(this.studentStorageTokenKey);
  }

  storeInstructorToken(token) {
    this.apiToken = token;
    const expiresAt = moment().add(1, 'day').format();

    localStorage.setItem(this.instructorStorageTokenKey, this.apiToken);
    localStorage.setItem(this.instructorStorageExpiresKey, expiresAt);
  }

  storeStudentToken(token) {
    this.apiToken = token;
    sessionStorage.setItem(this.studentStorageTokenKey, this.apiToken);
  }
}
