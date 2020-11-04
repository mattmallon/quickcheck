var browser3 = browser.params.browser3, //define browser instance from global value
    EC = protractor.ExpectedConditions,
    includes = require('../common/includes.js'),
    common = new includes.Common(browser3),
    data = includes.data,
    homePage = new includes.HomePage(browser3),
    editQcPage = new includes.EditQcPage(browser3),
    setPage = new includes.SetPage(browser3),
    viewSetsPage = new includes.ViewSetsPage(browser3);

//create a collection, then go back to the home page to add a new assessment group and quiz; we have so far created
//collections and assessment groups from the home page, and added quizzes to existing, but we haven't done the last
//permutation of adding an assessment group and quiz to an existing collection. it's not really specific to public
//collections, but figured this would be a good as place as any to test it, since we need to create new ones anyway.

describe('Adding a subset and quick check from the home page', function() {
    var set = data.sets.public,
        setName = set.name,
        subsetName = set.subsets.group1,
        qcName = set.quickchecks.assessment1;

    it('should create a set normally at first', async function() {
        await viewSetsPage.clickAddSetBtn();
        await viewSetsPage.getAddSetNameField().sendKeys(setName);
        await viewSetsPage.saveNewSet();
        await viewSetsPage.nav.goToHome();
    });

    it('should show all sets in the dropdown that the user has a membership in', async function() {
        await homePage.addQuickCheck();
        expect(await homePage.getSetOptions().count()).toBe(1);
        await homePage.selectSet(setName);
    });

    it('should show no subsets in the dropdown if none are present', async function() {
        expect(await homePage.getSubsetOptions().count()).toBe(0);
    });

    //Just add a single question; I was thinking originally that I would add all question types and make
    //sure that when an instructor who has joined a public set (with read-only permissions by default) that
    //all questions have their inputs disabled and delete option buttons invisible, but you know what?
    //As long as the save button is hidden, it really doesn't matter, since the user can't make changes
    //regardless. We might want to go back and add this all in later, if it becomes an issue, but it's doubtful.
    it('should redirect to the quick check after creating on the home page', async function() {
        await homePage.selectNewSubset();
        await homePage.getNewSubsetInput().sendKeys(subsetName);
        await homePage.saveNewQuickCheck(qcName);
        //THIS IS SO STUPID: kept on telling me name was blank, even though this worked fine on previous
        //tests. So I had to add in an expected condition for the name to be there before running test. ugh.
        await browser3.wait(EC.textToBePresentInElementValue(editQcPage.getNameInput(), qcName), 10000);
        expect(await editQcPage.getAssessmentName()).toBe(qcName);
    });

    it('should show the created subset on the set page', async function() {
        //add in questions, save, go back
        var options,
            question,
            subset,
            correctOption;

        await editQcPage.addQuestion(data.questionTypes.mc);
        question = editQcPage.getQuestion(0);
        options = question.getOptions();
        //we don't need to reference this question data later, so no need to store it centrally
        await question.enterMcTextOption(options.get(0), 'A');
        await question.enterMcTextOption(options.get(1), 'B');
        await question.enterMcTextOption(options.get(2), 'C');
        await question.enterMcTextOption(options.get(3), 'D');
        correctOption = options.get(0);
        await question.toggleMcOptionCorrect(correctOption);
        await editQcPage.save();
        await editQcPage.goBackToSet();
        await setPage.initSubsets();
        subset = setPage.getSubset(0);
        expect(await subset.getName()).toBe(subsetName.toUpperCase());
        await setPage.nav.goToSets();
    });
});

describe('Making a set public', function() {
    it('should initially show a notice that there are no public sets as of yet', async function() {
        await viewSetsPage.togglePublicSets();
        expect(await viewSetsPage.getNoPublicSetsMsg().isDisplayed()).toBe(true);
    });

    it('should initially show a button in a set to make a set public (initially it is private)', async function() {
        var set = viewSetsPage.getMembershipTiles().last(),
            goToSetBtn,
            toggleBtn;

        goToSetBtn = viewSetsPage.getGoToSetBtn(set);
        await common.scrollToElement(goToSetBtn);
        await goToSetBtn.click();
        toggleBtn = await setPage.getTogglePublicBtn();
        expect(await toggleBtn.isDisplayed()).toBe(true);
        expect(await toggleBtn.getText()).toContain('MAKE SET PUBLIC');
    });

    it('should offer a button that says to make a set private again after it has been made public', async function() {
        var toggleBtn = await setPage.getTogglePublicBtn();
        await toggleBtn.click();
        expect(await toggleBtn.getText()).toContain('MAKE SET PRIVATE');
    });

    it('should display that the set is public in the admin list of sets', async function() {
        var set;

        await setPage.nav.goToSets();
        set = viewSetsPage.getMembershipTiles().last();
        expect(await viewSetsPage.isSetPublic(set)).toBe(true);
    });

    it('should show the public set in the public set panel', async function () {
        var publicSet,
            publicSets;

        await viewSetsPage.togglePublicSets();
        publicSets = viewSetsPage.getPublicSets();
        expect(await publicSets.count()).toBe(1);
        publicSet = publicSets.get(0);
        expect(await publicSet.getText()).toContain(data.sets.public.name.toUpperCase());
    });

    it('should automatically have the admin enrolled since they created it/are a member', async function() {
        var publicSet = viewSetsPage.getPublicSets().get(0);

        expect(await viewSetsPage.getPublicJoinBtn(publicSet).isPresent()).toBe(false);
        expect(await viewSetsPage.getPublicOptOutBtn(publicSet).isDisplayed()).toBe(true);
    });
});