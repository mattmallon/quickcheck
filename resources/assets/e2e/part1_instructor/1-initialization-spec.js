var includes = require('../common/includes.js'),
    canvasLoginPage = new includes.CanvasLoginPage(browser),
    common = new includes.Common(browser),
    creds = includes.userCreds,
    data = includes.data,
    homePage = new includes.HomePage(browser),
    navComponent = new includes.NavComponent(browser),
    viewSetsPage = new includes.ViewSetsPage(browser);

describe('Navigating to the tool in Canvas', function () {
    it('should show the tool name in the Canvas nav', async function () {
        await common.enterNonAngularPage();
        await canvasLoginPage.login(creds.instructor.username, creds.instructor.password);
        const navItems = await canvasLoginPage.getNavItems();
        expect(navItems).toContain(common.toolName);
    });

    it('should reach the assessment home page when the tool is clicked', async function () {
        await common.goToQuickCheck();
        const header = await homePage.getHeader();
        expect(header).toContain('QUICK CHECK');
    });
});

describe('Accessing the list of sets for the first time', function() {
    it('should show no sets, but instead a message with instructions', async function() {
        await navComponent.goToSets();
        expect(await viewSetsPage.getMembershipTiles().count()).toBe(0);
        expect(await viewSetsPage.getInitialInstructions().isPresent()).toBe(true);
    });

    it('should not show a search box for sets', async function() {
        expect(await viewSetsPage.getSearchBox().isPresent()).toBe(false);
    });
});
