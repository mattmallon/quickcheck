var EditQcPage = function(browserRef) {
    var page = this,
        EC = protractor.ExpectedConditions;

    page.browser = browserRef;
    page.includes = require('../common/includes.js');
    page.common = new page.includes.Common(page.browser),

    //sub-components
    page.nav = new page.includes.NavComponent(page.browser);
    page.questions = [];

    //elements
    page.addQuestionBtn = page.browser.element(by.partialButtonText('Add question'));
    page.backBtn = page.browser.element(by.partialLinkText('Back'));
    page.customActivities = page.browser.element.all(by.css('.qc-edit-custom-activity-option'));
    page.customBtn = page.browser.element(by.partialButtonText('Make this a custom activity'));
    page.customDropdown = page.browser.element(by.css('#custom-activity'));
    page.customName = page.browser.element(by.css('.qc-edit-custom-activity-name'));
    page.deleteCustomBtn = page.browser.element(by.partialButtonText('Remove custom activity'));
    page.descriptionInput = page.browser.element(by.css('.qc-edit-description'));
    page.goBackToSetLink = page.browser.element(by.cssContainingText('a', 'Return to set'));
    page.nameInput = page.browser.element(by.css('.qc-edit-name'));
    page.questionsList = page.browser.element.all(by.css('.qc-question-panel'));
    page.readOnlyNotice = page.browser.element(by.css('.read-only-notice'));
    page.saveBtn = page.browser.element(by.css('.qc-btn-save-quiz'));
    page.saveErrorMsg = page.browser.element(by.css('.alert-danger'));
    page.saveSuccessMsg = page.browser.element(by.css('.alert-success'));
    page.subsetInput = page.browser.element(by.css('.qc-edit-group'));
    page.subsetOptions = page.browser.element(by.css('.qc-edit-group')).all(by.css('option'));
    page.titleInput = page.browser.element(by.css('.qc-edit-title'));

    //functions
    page.addQuestion = addQuestion;
    page.areInputsDisabled = areInputsDisabled;
    page.getAssessmentName = getAssessmentName;
    page.getCurrentSubset = getCurrentSubset;
    page.getCustomActivities = getCustomActivities;
    page.getCustomBtn = getCustomBtn;
    page.getCustomDropdown = getCustomDropdown;
    page.getCustomName = getCustomName;
    page.deleteCustom = deleteCustom;
    page.getCustomDeleteBtn = getCustomDeleteBtn;
    page.getDescriptionInput = getDescriptionInput;
    page.getNameInput = getNameInput;
    page.getQuestion = getQuestion;
    page.getQuestions = getQuestions;
    page.getSaveBtn = getSaveBtn
    page.getSaveError = getSaveError;
    page.getSaveSuccess = getSaveSuccess;
    page.getSubsetOptions = getSubsetOptions;
    page.getSubsetSelect = getSubsetSelect;
    page.getTitleInput = getTitleInput;
    page.goBack = goBack;
    page.goBackToSet = goBackToSet;
    page.initQuestions = initQuestions;
    page.isReadOnly = isReadOnly;
    page.save = save;
    page.saveWithError = saveWithError;
    page.saveWithoutSuccess = saveWithoutSuccess;
    page.waitForSaveFailure = waitForSaveFailure;
    page.waitForSaveSuccess = waitForSaveSuccess;

    async function addQuestion(questionType) {
        var newQuestion,
            questionCount,
            questionObject;

        await page.addQuestionBtn.click();
        questionCount = await page.getQuestions().count();

        newQuestion = page.getQuestions().get(questionCount - 1);
        questionObject = new page.includes.EditQuestionComponent(page.browser, newQuestion, questionType);
        //set the question type in the dropdown, but not multiple choice, since that's the default, and
        //changing the question type removes current options, requiring us to re-add what's already there
        if (questionType && questionType !== page.includes.data.questionTypes.mc) {
            await questionObject.setQuestionType(questionType);
            //make sure tinymce assets are fully loaded in question so click events hit the right spots
            await page.common.waitForTinyMce(newQuestion);
            await page.browser.sleep(500); //for good measure, still had intermittent issues
        }
        page.questions.push(questionObject);
    }

    async function areInputsDisabled() {
        var inputsDisabled = true;

        await page.browser.element.all(by.css('input')).each(async function(input) {
            if (!await input.getAttribute('disabled')) {
                inputsDisabled = false;
            }
        });

        return inputsDisabled;
    }

    async function deleteCustom() {
        await page.deleteCustomBtn.click();
    }

    async function getAssessmentName() {
        return await page.nameInput.getAttribute('value');
    }

    async function getCurrentSubset() {
        return await page.subsetInput.element(by.css('option:checked')).getText();
    }

    function getCustomActivities() {
        return page.customActivities;
    }

    function getCustomBtn() {
        return page.customBtn;
    }

    function getCustomDeleteBtn() {
        return page.deleteCustomBtn;
    }

    function getCustomDropdown() {
        return page.customDropdown;
    }

    async function getCustomName() {
        return await page.customName.getText();
    }

    function getDescriptionInput() {
        return page.descriptionInput;
    }

    function getNameInput() {
        return page.nameInput;
    }

    function getQuestion(index) {
        return page.questions[index];
    }

    function getQuestions() {
        return page.questionsList;
    }

    function getSaveBtn() {
        return page.saveBtn;
    }

    function getSaveError() {
        return page.saveErrorMsg;
    }

    function getSaveSuccess() {
        return page.saveSuccessMsg;
    }

    function getSubsetOptions() {
        return page.subsetOptions;
    }

    function getSubsetSelect() {
        return page.subsetInput;
    }

    function getTitleInput() {
        return page.titleInput;
    }

    async function goBack() {
        await page.backBtn.click();
    }

    async function goBackToSet() {
        await page.waitForSaveSuccess();
        await page.goBackToSetLink.click();
    }

    async function initQuestions() {
        page.questions = []; //clear if any were previously saved
        const questions = await page.getQuestions();
        for (const [index, question] of questions.entries()) {
            var questionElement = page.getQuestions().get(index),
                questionObject = new page.includes.EditQuestionComponent(page.browser, questionElement),
                questionType = await questionObject.getQuestionType();

            questionObject.composeQuestionType(questionType);
            page.questions.push(questionObject);
        }
    }

    async function isReadOnly() {
        return await page.readOnlyNotice.isPresent();
    }

    async function save() {
        await page.saveBtn.click();
        await page.browser.waitForAngular();
        const saveSuccess = await page.getSaveSuccess().isPresent();
        //8/28/19: intermittently tests would fail, button is clicked but nothing happens, and
        //requires clicking the button a second time to actually send the request. argh.
        if (!saveSuccess) {
            await page.saveBtn.click();
            await page.browser.waitForAngular();
        }
    }

    async function saveWithError() {
        await page.saveBtn.click();
        await page.browser.waitForAngular();
        await page.waitForSaveFailure();
    }

    //used when we don't wait for anything, such as when a required field is missing and no round-trip
    async function saveWithoutSuccess() {
        await page.saveBtn.click();
        await page.browser.waitForAngular();
    }

    async function waitForSaveFailure() {
        await page.browser.wait(EC.visibilityOf(page.saveErrorMsg), 10000);
    }

    async function waitForSaveSuccess() {
        await page.browser.wait(EC.elementToBeClickable(page.goBackToSetLink), 10000);
    }
}

module.exports = EditQcPage;