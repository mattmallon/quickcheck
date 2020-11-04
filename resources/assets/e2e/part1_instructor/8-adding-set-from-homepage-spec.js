var EC = protractor.ExpectedConditions,
    includes = require('../common/includes.js'),
    common = new includes.Common(browser),
    data = includes.data,
    editQcPage = new includes.EditQcPage(browser),
    homePage = new includes.HomePage(browser),
    setPage = new includes.SetPage(browser);

describe('Adding a new set, subset, and quick checkfrom the home page', function() {
    var setName = data.sets.featuresAllOn.name,
        subsetName = data.sets.featuresAllOn.subsets.group1,
        quickCheckName = data.sets.featuresAllOn.quickchecks.featuresAllOn;

    it('should show a field input when a new set is selected', async function() {
        var setInput;

        await homePage.addQuickCheck();
        await homePage.selectNewSet();
        setInput = homePage.getNewSetInput();
        expect(await setInput.isDisplayed()).toBe(true);
        await setInput.sendKeys(setName);
    });

    it('should show a field input when a new subset is selected', async function() {
        var subsetInput;

        subsetInput = homePage.getNewSubsetInput();
        expect(await subsetInput.isDisplayed()).toBe(true);
        await subsetInput.sendKeys(subsetName);
    });

    it('should redirect to the new quick check after saving', async function() {
        await homePage.saveNewQuickCheck(quickCheckName);
        const name = await editQcPage.getAssessmentName();
        expect(name).toBe(quickCheckName);
    });

    it('should have the correct subset selected', async function() {
        var subsetSelect = await editQcPage.getSubsetSelect();
        expect(await common.getSelectedText(subsetSelect)).toBe(subsetName);
    });

    it('should correctly save the subset', async function() {
        var subset;

        await editQcPage.save(); //save first to prevent alert
        await editQcPage.goBackToSet();
        await setPage.initSubsets();
        subset = setPage.getSubsets().get(0);
        expect(await subset.getText()).toContain(subsetName);
    });

    it('should correctly save the set', async function() {
        var subset,
            quickcheck;

        subset = setPage.getSubset(0);
        expect(await setPage.getSetName()).toBe(setName.toUpperCase());
        //go back to the quiz
        quickcheck = subset.getQuickChecks().get(0);
        await subset.editQuickCheck(quickcheck);
    });
});
