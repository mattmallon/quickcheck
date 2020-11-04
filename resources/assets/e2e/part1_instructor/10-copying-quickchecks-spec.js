var includes = require('../common/includes.js'),
    allQuestionTypesData = new includes.AllQuestionTypesData(),
    common = new includes.Common(browser),
    data = includes.data,
    editQcPage = new includes.EditQcPage(browser),
    setPage = new includes.SetPage(browser),
    viewSetsPage = new includes.ViewSetsPage(browser);

describe('Copying a quick check', function() {
    var set,
        subset,
        quickCheck,
        setData = data.sets.featuresAllOn;

    it('should display the correct form when the copy button is clicked', async function() {
        //navigate to set.
        await setPage.nav.goToSets();
        set = viewSetsPage.getMembershipTiles().first();
        await viewSetsPage.getGoToSetBtn(set).click();

        await setPage.initSubsets();
        subset = setPage.getSubset(1);
        quickCheck = subset.getQuickChecks().get(0);
        await subset.copyQuickCheck(quickCheck);
        expect(await subset.getCopyPanel(quickCheck).isDisplayed()).toBe(true);
    });

    it('should default to the current set', async function() {
        expect(await subset.getCopySelectSetDropdownValue(quickCheck)).toContain(setData.name);
    });

    it('should default to the current subset', async function() {
        expect(await subset.getCopySelectSubsetDropdownValue(quickCheck)).toContain(setData.subsets.group2);
    });

    it('should default to the name of the quick check plus copy', async function() {
        var name = setData.quickchecks.featuresAllOn + ' copy';
        expect(await subset.getCopyQuickCheckName(quickCheck)).toBe(name);
    });

    it('should list all set memberships as possibilities', async function() {
        var options = subset.getCopySelectSetDropdownOptions(quickCheck);
        expect(await options.count()).toBe(2);
        expect(await options.get(0).getText()).toContain(setData.name);
        expect(await options.get(1).getText()).toContain(data.sets.featuresAllOff.name);
    });

    it('should list all subsets in the default set', async function() {
        var options = subset.getCopySelectSubsetDropdownOptions(quickCheck);
        expect(await options.count()).toBe(2);
        expect(await options.get(0).getText()).toContain(setData.subsets.group1);
        expect(await options.get(1).getText()).toContain(setData.subsets.group2);
    });

    it('should show the copied quick check in the subset after saving', async function() {
        await subset.submitCopy(quickCheck);
        expect(await subset.getQuickChecks().count()).toBe(2);
    });

    it('should contain a link to edit the newly copied quick check', async function() {
        var editBtn = subset.getCopyEditBtn(quickCheck);
        expect(await editBtn.isDisplayed()).toBe(true);

        //next, click the button to edit
        await editBtn.click();
    });
});

describe('Copying a quick check should keep the data intact', function() {
    it('successfully', async function() {
        await allQuestionTypesData.verify(editQcPage, data);
    });

    it('and delete successfully afterward', async function() {
        //delete the copied quick check and go back to iframe in original tab
        await editQcPage.save();
        await editQcPage.goBackToSet();
        await setPage.initSubsets();
        subset = setPage.getSubset(1);
        quickCheck = subset.getQuickChecks().get(1);
        await subset.deleteQuickCheck(quickCheck);
        await common.acceptAlert(browser);
        await setPage.nav.goToSets();
        set = viewSetsPage.getMembershipTiles().first();
        await viewSetsPage.getGoToSetBtn(set).click();
    });
});