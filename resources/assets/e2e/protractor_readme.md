# Testing in Protractor

Acceptance/regression testing using Angular's Protractor service (built on top of Selenium) should be completed to ensure that the app is functional when new features are added, to prevent regression errors.

## Disclaimer: tests are for internal development use only!

The acceptance tests are configured to work specifically with IU systems, and should only be used for internal development use. Users of the open source app are not encouraged to make use of these tests. Unfortunately, it's impossible to anticipate which authentication mechanisms each individual institution uses to login to Canvas, and custom code would have to be written for Protractor for each different authentication form. This application relies on acceptance tests rather than unit tests due to heavy reliance on LTI and Canvas, and testing live in the browser is the only route to test against breaking changes in Canvas and its LTI implementation that would affect the application.

## Steps:

1. Install Protractor locally (instructions here: http://www.protractortest.org/#/). You may need to login to an admin account using `su` and then run the install command with `sudo`. If you are still running into issues, then try the following steps:

   1. `su [your admin username]`
   2. `brew update`
   3. `brew upgrade node`
   4. `npm install -g npm`
   5. `sudo npm install -g protractor`
   6. `sudo webdriver-manager update`
   7. Install the most recent JDK version from here: http://www.oracle.com/technetwork/java/javase/downloads/index.html

2. In public/assets/src/js/tests/protractor, add a usercreds.js file with the following code to include information on the various guest accounts used while testing (make sure to fill in the values with the credential information):

```
module.exports = {
    'admin': {
        'username': '',
        'password': '',
        'id': '80001101342',
        'first': 'IUeDS',
        'last': 'Testuser'
    },
    'instructor': {
        'username': '',
        'password': '',
        'id': '80001101345',
        'first': 'IUeDS',
        'last': 'Testinstructor'
    },
    'student': {
        'username': '',
        'password': '',
        'id': '80001101347',
        'first': 'IUeDS',
        'last': 'Teststudent'
    }
};
```

3. The regression environment is automatically built in codepipeline, but it is not running at all times, to save on expense. Update the service's running task count from 0 to 1 to test.
4. To reset the database for testing, connect to the regression database locally from your local docker container, and update your env to use the regression database credentials and an `APP_ENV` of `reg`. Run `php artisan migrate:refresh --seed` to reset. Exec-ing into your local running container is fine for this.
5. In the regression testing course, make sure that all assignments and modules are deleted, if they are still present from previous tests. This course has the regression version of the app installed.
6. Run `ng e2e` in the app root to run the tests.
  - It will automatically update the webdriver-manager to use the latest chromedriver version. If you are repeatedly running tests to troubleshoot, etc., then this can be disabled with the flag `--webdriverUpdate=false`
  - It will also re-compile the code every time you run tests. Similar to the above, if you wish to disable this for repeated troubleshooting, use the flag `--dev-server-target=` (yes, the value is left intentionally blank).
7. 4 test suites will be run within Canvas, in the regression testing course. Tests typically take 8-10 minutes. IU guest accounts are used for instructor, student, and admin roles. If you need to run tests multiple times while developing a feature, make sure to refresh/reseed the database on the server and delete all assignments/modules in the test course before running the test suite again. Note that in the regression environment of the tool, the left nav LTI config is set up to open in a new tab, as Protractor was having significant issues running these tests inside of an iframe. (It seems to work OK when taking a QC, however. This may be due to the sheer size of the iframe in the instructor portion in the left nav.)