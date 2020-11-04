var browser3 = browser.params.browser3, //define browser instance from global value
    includes = require('../common/includes.js'),
    common = new includes.Common(browser3),
    data = includes.data,
    attemptOverviewPage = new includes.AttemptOverviewPage(browser3),
    attemptsPage = new includes.AttemptsPage(browser3),
    canvasAssignmentsPage = new includes.CanvasAssignmentsPage(browser3),
    editQcPage = new includes.EditQcPage(browser3),
    embedPage = new includes.EmbedPage(browser3),
    homePage = new includes.HomePage(browser3),
    setPage = new includes.SetPage(browser3),
    viewSetsPage = new includes.ViewSetsPage(browser3);

describe('Making a quick check a custom activity', function() {
    var customData = data.customActivity;

    it('should show the button to make it a custom activity before questions are added', async function() {
        var set,
            goToSetBtn,
            subset,
            quickcheck;

        await viewSetsPage.toggleAdminViewAllSets();
        set = viewSetsPage.getAdminSetTiles().get(0); //add to a set the instructor can access for testing
        goToSetBtn = viewSetsPage.getGoToSetBtn(set);
        await common.scrollToElement(goToSetBtn);
        await goToSetBtn.click();
        await setPage.initSubsets();
        subset = setPage.getSubset(0);
        await subset.addAndSaveQuickCheck(data.sets.featuresAllOn.quickchecks.custom);
        quickcheck = subset.getQuickChecks().last();
        await subset.editQuickCheck(quickcheck);
        expect(await editQcPage.getCustomBtn().isDisplayed()).toBe(true);
    });

    it('should hide the button to make it a custom activity after a question has been added', async function() {
        await editQcPage.addQuestion(data.questionTypes.mc);
        expect(await editQcPage.getCustomBtn().isPresent()).toBe(false);
    });

    it('should show the button again after the question has been deleted', async function() {
        await editQcPage.getQuestion(0).deleteQuestion();
        expect(await editQcPage.getCustomBtn().isDisplayed()).toBe(true);
    });

    it('should show the proper form when the button is clicked', async function() {
        await editQcPage.getCustomBtn().click();
        expect(await editQcPage.getCustomDropdown().isDisplayed()).toBe(true);
    });

    it('should show a list of all custom activities in the dropdown', async function() {
        var customActivities = editQcPage.getCustomActivities();
        expect(await customActivities.count()).toBe(1);
        expect(await customActivities.get(0).getText()).toBe(customData.name);
    });

    it('should display the custom activity information when one is selected from the dropdown', async function() {
        var customDropdown = editQcPage.getCustomDropdown();
        await customDropdown.sendKeys(customData.name);
        expect(await editQcPage.getCustomName()).toContain(customData.name);
    });

    it('should delete the custom activity when the delete button is clicked', async function() {
        await editQcPage.deleteCustom();
        expect(await editQcPage.getCustomBtn().isDisplayed()).toBe(true);
    });

    it('should keep the custom activity information when the quick check is saved', async function() {
        //re-add it and save
        await editQcPage.getCustomBtn().click();
        await editQcPage.getCustomDropdown().sendKeys(customData.name);
        await editQcPage.save();
        expect(await editQcPage.getSaveSuccess().isDisplayed()).toBe(true);
        expect(await editQcPage.getCustomName()).toContain(customData.name);
    });

    it('should show the proper custom activity when previewing', async function() {
        var subset,
            quickcheck;

        await editQcPage.goBackToSet();
        await setPage.initSubsets();
        subset = setPage.getSubset(0);
        quickcheck = subset.getQuickChecks().last();
        await subset.previewQuickCheck(quickcheck);
        await common.enterNonAngularPage();
        await common.switchTab(2);
        expect(await browser3.driver.getCurrentUrl()).toContain(customData.url);
    });
});

describe('Embedding and taking a custom activity', function() {
    var customData = data.customActivity;

    it('should only show personal memberships for admins in the select panel at first', async function() {
        await browser3.close();
        await common.switchTab(1);
        await browser3.close();
        await common.switchTab(0);
        await canvasAssignmentsPage.createAssignmentAndOpenEmbed(customData.name, '1');
        await common.enterAngularPage();
        expect(await embedPage.getSets().count()).toBe(1);
    });

    it('should show all sets in the system for admins in the select panel after toggling', async function() {
        await embedPage.toggleAdminViewAll();
        expect(await embedPage.getAdminSets().count()).toBe(3);
    });

    it('should show a custom icon next to the activity in the embed window', async function() {
        var qcName = data.sets.featuresAllOn.quickchecks.custom,
            quickcheck = embedPage.getQuickChecks().get(0);

        expect(await quickcheck.getText()).toContain('Custom');

        //embed
        await embedPage.search(qcName);
        await embedPage.selectSearchedQuickCheckByIndex(0);
        await common.switchToCanvas();
        await canvasAssignmentsPage.saveEmbed();
        await common.switchToLtiTool();
    });

    it('should show the correct custom activity', async function() {
        //tried getting the url, but was referencing parent iframe. Instead, just check for a class we know is in the activity.
        expect(await browser3.driver.findElement(by.className('question_area')).isDisplayed()).toBe(true);
    });

    it('should allow answering 1 correct question and 1 incorrect question', async function() {
        // we're using the P101 brain drag and drop custom activity; no need to make this object-oriented, not reusable
        // drag and drop: http://stackoverflow.com/questions/25664551/how-to-simulate-a-drag-and-drop-action-in-protractor
        questionBox = browser3.driver.findElement(by.className('question_area'));
        answerArea = browser3.driver.findElement(by.css('.label_dropzone[data-label="Cerebellum"]'));
        await common.dragAndDrop(questionBox, answerArea);
        await browser3.driver.sleep(1000);
        submitBtn = browser3.driver.findElement(by.css('.submit_response'));
        await submitBtn.click();
        await browser3.driver.sleep(1000);
        nextBtn = browser3.driver.findElement(by.css('.btn.next'));
        await nextBtn.click();
        await browser3.driver.sleep(1000);
        await common.dragAndDrop(questionBox, answerArea);
        await browser3.driver.sleep(1000);
        await submitBtn.click();
        await browser3.driver.sleep(1000);
        await browser3.driver.switchTo().defaultContent();
        await common.goToQuickCheck();
    });

    it('should show the attempt data correctly in the results view', async function() {
        var assessmentName = data.sets.featuresAllOn.quickchecks.custom;

        await homePage.nav.goToResults();
        await attemptOverviewPage.getAssessmentByName(assessmentName).click();
        expect(await attemptsPage.attempts.getCorrect(0)).toBe('1');
        expect(await attemptsPage.attempts.getIncorrect(0)).toBe('1');
        expect(await attemptsPage.attempts.getScore(0)).toBe('10%');
    });

    it('should show a responses table in the results view', async function() {
        await attemptsPage.attempts.getResponsesBtn(0).click();
        expect(await attemptsPage.customResponses.isResponseTable()).toBe(true);
    });

    it('should correctly show the response data in the results view', async function() {
        var responses = attemptsPage.customResponses; //for easier typing

        expect(await responses.getQuestion(0)).toBe('This region allows you to balance while riding a bicycle.');
        expect(await responses.getAnswer(0)).toBe('Cerebellum');
        expect(await responses.getAnswerKey(0)).toBe('Cerebellum');
        expect(await responses.isCorrect(0)).toBe(true);
        expect(await responses.getQuestion(1)).toBe('This region is almost entirely dedicated to vision.');
        expect(await responses.getAnswer(1)).toBe('Cerebellum');
        expect(await responses.getAnswerKey(1)).toBe('Occipital Lobe');
        expect(await responses.isCorrect(1)).toBe(false);
    });
});