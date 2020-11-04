var EditFeedbackComponent = function(browserRef, question) {
    var component = this,
        EC = protractor.ExpectedConditions;

    component.browser = browserRef;
    component.question = question;

    //elements
    component.correctFeedback = component.question.element(by.css('.qc-custom-feedback-correct textarea'));
    component.correctFeedbackContainer = component.question.element(by.css('.qc-custom-feedback-correct'));
    component.customFeedbackBtn = component.question.element(by.css('.qc-btn-add-feedback'))
    component.customFeedbackPanel = component.question.element(by.css('.qc-custom-feedback-container'));
    component.deleteFeedbackBtn = component.question.element(by.css('.qc-delete-feedback-btn'));
    component.incorrectFeedback = component.question.element(by.css('.qc-custom-feedback-incorrect textarea'));
    component.questionLevelFeedbackContainer = component.question.element(by.css('.qc-custom-feedback-general'));
    component.perResponseFeedbackCheckbox = component.question.element(by.css('.qc-custom-feedback-response-checkbox input'));
    component.perResponseFeedbackOptions = component.customFeedbackPanel.all(by.css('.qc-edit-response-feedback-option'));
    component.richContentToggle = component.customFeedbackPanel.element(by.css('.qc-rich-content-toggle label'));

    //strings for sub-elements
    component.perResponseFeedbackCorrectClass = 'qc-custom-feedback-correct';
    component.perResponseFeedbackInput = '.qc-edit-response-feedback';

    //functions
    component.addCustomFeedback = addCustomFeedback;
    component.deleteFeedback = deleteFeedback;
    component.enterResponseFeedback = enterResponseFeedback;
    component.getCorrectFeedback = getCorrectFeedback;
    component.getCorrectFeedbackContainer = getCorrectFeedbackContainer;
    component.getFeedbackPanel = getFeedbackPanel;
    component.getIncorrectFeedback = getIncorrectFeedback;
    component.getPerResponseFeedbackCheckbox = getPerResponseFeedbackCheckbox;
    component.getPerResponseFeedbackInput = getPerResponseFeedbackInput;
    component.getPerResponseFeedbackOptions = getPerResponseFeedbackOptions;
    component.getPerResponseFeedbackText = getPerResponseFeedbackText;
    component.getQuestionLevelFeedbackContainer = getQuestionLevelFeedbackContainer;
    component.getRichContentToggle = getRichContentToggle;
    component.isFeedbackOptionMarkedCorrect = isFeedbackOptionMarkedCorrect;
    component.togglePerResponseFeedback = togglePerResponseFeedback;
    component.toggleRichContent = toggleRichContent;

    async function addCustomFeedback() {
        await component.customFeedbackBtn.click();
    }

    async function deleteFeedback() {
        await component.deleteFeedbackBtn.click();
    }

    async function enterResponseFeedback(option, text) {
        await option.element(by.css(component.perResponseFeedbackInput)).sendKeys(text);
    }

    function getCorrectFeedback() {
        return component.correctFeedback;
    }

    //need this to find the tinymce iframe when rich content is toggled on
    function getCorrectFeedbackContainer() {
        return component.correctFeedbackContainer;
    }

    function getFeedbackPanel() {
        return component.customFeedbackPanel;
    }

    function getIncorrectFeedback() {
        return component.incorrectFeedback;
    }

    function getPerResponseFeedbackCheckbox() {
        return component.perResponseFeedbackCheckbox;
    }

    function getPerResponseFeedbackInput(responseFeedback) {
        return responseFeedback.element(by.css('textarea'));
    }

    function getPerResponseFeedbackOptions() {
        return component.perResponseFeedbackOptions;
    }

    async function getPerResponseFeedbackText(responseFeedback) {
        return await responseFeedback.element(by.css(component.perResponseFeedbackInput)).getAttribute('value');
    }

    function getQuestionLevelFeedbackContainer() {
        return component.questionLevelFeedbackContainer;
    }

    function getRichContentToggle() {
        return component.richContentToggle;
    }

    async function isFeedbackOptionMarkedCorrect(option) {
        const value = await option.getAttribute('class');

        if (value.indexOf(component.perResponseFeedbackCorrectClass) > -1) {
            return true;
        }

        return false;
    }

    async function togglePerResponseFeedback() {
        await component.perResponseFeedbackCheckbox.click();
    }

    async function toggleRichContent() {
        await component.richContentToggle.click();
    }
}

module.exports = EditFeedbackComponent;