var includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser),
    attemptOverviewPage = new includes.AttemptOverviewPage(browser),
    attemptsPage = new includes.AttemptsPage(browser),
    viewSetspage = new includes.ViewSetsPage(browser),
    setPage = new includes.SetPage(browser),
    editQcPage = new includes.EditQcPage(browser);

describe('Viewing assessments that are custom activities', function() {
    it('should show the proper custom activity information', async function() {
        var set,
            subset,
            quickcheck;

        //custom activity is first set, first subset, first quick check
        set = viewSetspage.getMembershipTiles().first();
        await viewSetspage.getGoToSetBtn(set).click();
        await setPage.initSubsets();
        subset = setPage.getSubset(0);
        quickcheck = subset.getQuickChecks().get(0);
        await subset.editQuickCheck(quickcheck);
        expect(await editQcPage.getCustomName()).toContain(data.customActivity.name);
    });

    it('should not allow an instructor to change a custom activity', async function() {
        expect(await editQcPage.getCustomDropdown().isPresent()).toBe(false);
    });

    it('should not allow an instructor to delete a custom activity', async function() {
        expect(await editQcPage.getCustomDeleteBtn().isPresent()).toBe(false);
    });

    it('should allow the instructor to change parts of the assessment unrelated to the custom activity', async function() {
        var nameInput = editQcPage.getNameInput();
        await nameInput.clear();
        await nameInput.sendKeys('Name does not matter');
        await editQcPage.save();
        expect(await editQcPage.getSaveSuccess().isDisplayed()).toBe(true);
        await editQcPage.goBackToSet();
        await setPage.nav.goToSets();
    });
});