browser.params.browser3 = browser.forkNewDriverInstance(); //fork new browser instance for admin
var browser3 = browser.params.browser3, //define browser instance from global value
    includes = require('../common/includes.js'),
    canvasLoginPage = new includes.CanvasLoginPage(browser3),
    common = new includes.Common(browser3),
    creds = includes.userCreds,
    data = includes.data,
    homePage = new includes.HomePage(browser3),
    viewSetsPage = new includes.ViewSetsPage(browser3);

describe('An admin viewing the sets home page', function() {
    it('should see no sets initially because the admin has not personally created any', async function() {
        await common.enterNonAngularPage();
        await canvasLoginPage.login(creds.admin.username, creds.admin.password);
        //for some reason angular wasn't waiting, failed all tests, even though it works fine for instructor? argh.
        //did run into some similar issues for the student tests, though, so implementing something similar here.
        await common.enterNonAngularPage();
        await browser3.sleep(5000);
        await common.goToQuickCheck();
        await common.enterAngularPage();
        await homePage.nav.goToSets();
        expect(await viewSetsPage.getInitialInstructions().isDisplayed()).toBe(true);
    });

    //this one is dependent on suite 1 and the previous sets that the instructor created
    it('should see all sets created in the system after toggling to see them', async function() {
        await viewSetsPage.toggleAdminViewAllSets();
        expect(await viewSetsPage.getAdminSetTiles().count()).toBe(2);
        expect(await viewSetsPage.getInitialInstructions().isPresent()).toBe(false);
    });


    it('should see no sets again after toggling the view for all sets back to off', async function() {
        await viewSetsPage.toggleAdminViewAllSets();
        expect(await viewSetsPage.getAdminSetTiles().count()).toBe(0);
        expect(await viewSetsPage.getInitialInstructions().isDisplayed()).toBe(true);
    });
});

describe('Inviting an admin user', function() {
    it('should show the proper form when the add admin user button is clicked', async function() {
        await viewSetsPage.toggleAdminViewAllSets(); //toggle back on to view all sets
        await viewSetsPage.addAdminUser();
        expect(await viewSetsPage.getAdminUserInput().isDisplayed()).toBe(true);
    });

    it('should throw an error when the username is invalid', async function() {
        await viewSetsPage.getAdminUserInput().sendKeys('Thisusernameistotallyinvalid');
        await viewSetsPage.submitAdminUser();
        expect(await viewSetsPage.getAdminUserValidationError().isDisplayed()).toBe(true);
    });

    it('should show a success message when the user is valid', async function() {
        await viewSetsPage.getAdminUserInput().clear();
        await viewSetsPage.getAdminUserInput().sendKeys(browser.params.inviteUser);
        await viewSetsPage.submitAdminUser();
        expect(await viewSetsPage.getAdminUserSuccess().isDisplayed()).toBe(true);
    });
});