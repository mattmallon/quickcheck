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
  casRedirectStorageKey = 'iu-eds-qc-cas-redirect-url';
  instructorStorageExpiresKey = 'iu-eds-qc-instructor-token-expires';
  instructorStorageTokenKey = 'iu-eds-qc-instructor-token';
  studentStorageTokenKey = 'iu-eds-qc-student-token';

  constructor(
    private httpClient: HttpClient,
    private httpService: HttpService,
    private route: ActivatedRoute) { }

  async authenticate() {
    const queryParams = this.route.snapshot.queryParamMap;
    const role = queryParams.get('role');
    const userId = queryParams.get('userId');
    const nonce = queryParams.get('nonce');

    if (!role || !userId || !nonce) {
      throw new Error('Authentication failed, required parameters not present.');
    }

    const timeoutLength = this.httpService.getMediumTimeout();
    const path = this.httpService.getApiRoute() + '/authenticate';
    const params = { role, userId, nonce };

    return await this.httpClient.post(path, params)
      .pipe(timeout(timeoutLength))
      .toPromise();
  }

  casRedirect() {
    if (!this.storageAvailable('localStorage')) {
      return false;
    }

    const redirectUrl = localStorage.getItem(this.casRedirectStorageKey);

    if (!redirectUrl) {
      return false;
    }

    localStorage.removeItem(this.casRedirectStorageKey);
    window.location.replace(redirectUrl);
  }

  getInstructorTokenFromStorage() {
    //if in an iframe with 3rd party cookies blocked, return what's in-memory
    if (!this.storageAvailable('localStorage')) {
      return this.apiToken;
    }

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
    //if in an iframe with 3rd party cookies blocked, return what's in-memory
    if (!this.storageAvailable('sessionStorage')) {
      return this.apiToken;
    }

    return sessionStorage.getItem(this.studentStorageTokenKey);
  }

  isCasRedirect() {
    if (!this.storageAvailable('localStorage')) {
      return false;
    }

    const redirectUrl = localStorage.getItem(this.casRedirectStorageKey);

    if (!redirectUrl) {
      return false;
    }

    return true;
  }

  //source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Testing_for_availability
  storageAvailable(type) {
    var storage;
    try {
      storage = window[type];
      var x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    }
    catch(e) {
      return e instanceof DOMException && (
        // everything except Firefox
        e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === 'QuotaExceededError' ||
        // Firefox
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
        // acknowledge QuotaExceededError only if there's something already stored
        (storage && storage.length !== 0);
    }
  }

  //if user does not have an API token set in local storage and has to go through CAS
  //redirect for auth, store original URL (including course context) before the redirect
  //and retrieve it later after authenticating to return to original location.
  storeCasRedirectUrl() {
    if (!this.storageAvailable('localStorage')) {
      return false;
    }

    //after the CAS redirect, LTI context will unfortunately vanish when we do the auth redirects.
    //all of the other query params needed for auth will no longer be needed after the auth flow
    //completes and local storage is set with the API token. so our redirect url is current url
    //along with the context ID added, if it exists, otherwise add nothing else on.
    const queryParams = this.route.snapshot.queryParamMap;
    const contextId = queryParams.get('context');
    const url = window.location.href.split('?')[0];
    const urlWithContext = contextId ? url + '?context=' + contextId : url;

    localStorage.setItem(this.casRedirectStorageKey, urlWithContext);
  }

  storeInstructorToken(token) {
    this.apiToken = token;
    const expiresAt = moment().add(1, 'day').format();

    //if in an iframe with 3rd party cookies blocked, can't store
    if (!this.storageAvailable('localStorage')) {
      return;
    }

    localStorage.setItem(this.instructorStorageTokenKey, this.apiToken);
    localStorage.setItem(this.instructorStorageExpiresKey, expiresAt);
  }

  storeStudentToken(token) {
    this.apiToken = token;

    //if in an iframe with 3rd party cookies blocked, can't store
    if (!this.storageAvailable('sessionStorage')) {
      return;
    }

    sessionStorage.setItem(this.studentStorageTokenKey, this.apiToken);
  }
}
