var includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser),
    viewSetsPage = new includes.ViewSetsPage(browser),
    setPage = new includes.SetPage(browser),
    editQcPage = new includes.EditQcPage(browser);

describe('Joining a public set', function() {
    var publicSet;

    it('should show the set in the public set panel', async function() {
        var publicSets;

        await viewSetsPage.togglePublicSets();
        publicSets = viewSetsPage.getPublicSets();
        publicSet = publicSets.get(0);
        expect(await publicSets.count()).toBe(1);
    });

    it('should show the public set name', async function() {
        expect(await publicSet.getText()).toContain(data.sets.public.name.toUpperCase());
    });

    it('should show a join button initially', async function() {
        var joinBtn = viewSetsPage.getPublicJoinBtn(publicSet);

        expect(await joinBtn.isPresent()).toBe(true);
        await joinBtn.click();
    });

    it('should show a button to view the collection after joining', async function() {
        var viewBtn = viewSetsPage.getPublicViewBtn(publicSet);
        expect(await viewBtn.isDisplayed()).toBe(true);
        await viewBtn.click();
    });
});

describe('Viewing a public/read-only collection', function() {
    it('should show a notice that the user has read-only permissions', async function() {
        await setPage.initSubsets();
        expect(await setPage.isReadOnly()).toBe(true);
    });

    it('should not show a list of users', async function() {
        expect(await setPage.getUsersAccordion().isPresent()).toBe(false);
    });

    it('should show features that are enabled but not allow the user to toggle them', async function() {
        await setPage.openFeaturesAccordion();
        await setPage.featurePanel.getFeatures().each(async function(feature) {
            expect(await setPage.featurePanel.isFeatureToggleable(feature)).toBe(false);
        });
    });

    it('should not allow the user to add, edit, or delete subsets', async function() {
        //just one subset in here
        var subset = setPage.getSubset(0);

        expect(await setPage.getAddSubsetBtn().isPresent()).toBe(false);
        expect(await subset.getEditSubsetBtn().isPresent()).toBe(false);
        expect(await subset.getDeleteSubsetBtn().isPresent()).toBe(false);
    });

    it('should not allow the user to add or delete quick checks', async function() {
        var subset = setPage.getSubset(0),
            quickcheck = subset.getQuickChecks().get(0);

        expect(await subset.getAddQcBtn().isPresent()).toBe(false);
        expect(await subset.getDeleteQcBtn(quickcheck).isPresent()).toBe(false);
        await subset.editQuickCheck(quickcheck);
    });
});

//I was worried about having to check every single question type to make sure that a read-only user can't make edits,
//but let's take a more macro look at this and loop through every type of input and make sure that it is disabled
describe('Viewing a read-only quick check', function() {
    it('should show a read-only notice', async function() {
        await editQcPage.initQuestions();
        expect(await editQcPage.isReadOnly()).toBe(true);
    });

    it('should disable all input fields', async function() {
        expect(await editQcPage.areInputsDisabled()).toBe(true);
    });

    it('should hide delete question and delete option buttons', async function() {
        for (let question of editQcPage.questions) {
            expect(await question.getDeleteBtn().isPresent()).toBe(false);
            expect(await question.getDeleteOptionBtns().count()).toBe(0);
        }
    });

    it('should hide the save button', async function() {
        expect(await editQcPage.getSaveBtn().isPresent()).toBe(false);
        await editQcPage.nav.goToSets();
    });
});

describe('Opting out of a public set', function() {
    var publicSet;

    it('should show an opt-out button after joining', async function() {
        var optOutBtn;

        await viewSetsPage.togglePublicSets();
        publicSet = viewSetsPage.getPublicSets().get(0);
        optOutBtn = viewSetsPage.getPublicOptOutBtn(publicSet);
        expect(await optOutBtn.isPresent()).toBe(true);
        await optOutBtn.click();
    });

    it('should show a join button after opting out', async function() {
        expect(await viewSetsPage.getPublicJoinBtn(publicSet).isPresent()).toBe(true);
    });
});