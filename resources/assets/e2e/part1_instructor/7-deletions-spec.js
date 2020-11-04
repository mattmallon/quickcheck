var includes = require('../common/includes.js'),
    common = new includes.Common(browser),
    setPage = new includes.SetPage(browser),
    viewSetsPage = new includes.ViewSetsPage(browser);

describe('Deleting a quick check from a subset', function () {
    it('should remove the quick check from the page', async function () {
        var subset,
            quickcheck;

        await setPage.initSubsets();
        subset = setPage.getSubset(0);
        quickcheck = subset.getQuickChecks().get(0);
        await subset.deleteQuickCheck(quickcheck);
        await common.acceptAlert(browser);
        expect(await subset.getQuickChecks().count()).toBe(0);
    });
});

describe('Deleting a subset', function () {
    it('should remove the subset from the page', async function () {
        var subset = setPage.getSubset(0);
        await subset.deleteSubset();
        await common.acceptAlert(browser);
        expect(await setPage.getSubsets().count()).toBe(0);
    });
});

describe('Deleting a collection', function () {
    it('should confirm first before deleting', async function () {
        var set;

        await setPage.nav.goToSets();
        set = viewSetsPage.getMembershipTiles().get(0);
        await viewSetsPage.deleteSet(set);
        await common.acceptAlert(browser);
    });

    it('should remove the collection from the user\'s list after deletion', async function () {
        //refresh because deleted sets are technically hidden rather than fetching all sets from the
        //server over again
        await browser.refresh();
        expect(await viewSetsPage.getMembershipTiles().count()).toBe(0);

        //set up for next test
        await viewSetsPage.nav.goToHome();
    });
});
