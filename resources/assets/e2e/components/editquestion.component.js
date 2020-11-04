var EditQuestionComponent = function(browserRef, question, questionType) {
    var component = this;
    component.browser = browserRef;
    component.includes = require('../common/includes.js');
    component.questionTypes = component.includes.data.questionTypes;
    component.questionType = questionType;
    //default to first question; can be set manually as well
    if (question) {
        component.question = question;
    }
    else {
        component.question = component.browser.element.all(by.css('.qc-question-panel')).first();
    }

    //sub-components
    component.feedback = new component.includes.EditFeedbackComponent(browserRef, question);

    //elements
    component.deleteBtn = component.question.element(by.css('.qc-delete-question-btn'));
    component.headerText = component.question.element(by.css('.qc-question-header-number'));
    component.options = component.question.all(by.css('.qc-edit-option'));
    component.questionTypeDropdown = component.question.element(by.css('.qc-edit-question-type'));
    component.randomizedCheckbox = component.question.element(by.css('.qc-randomize-checkbox'));
    component.reorderDownBtn = component.question.element(by.css('.qc-reorder-down-btn'));
    component.reorderUpBtn = component.question.element(by.css('.qc-reorder-up-btn'));
    component.richContentToggle = component.question.element(by.css('.qc-rich-content-toggle label'));

    //string references (for sub-elements)
    component.deleteOptionBtn = '.qc-delete-option-btn-inline';

    //functions
    component.composeQuestionType = composeQuestionType;
    component.deleteOption = deleteOption;
    component.deleteQuestion = deleteQuestion;
    component.getDeleteBtn = getDeleteBtn;
    component.getDeleteOptionBtns = getDeleteOptionBtns;
    component.getHeaderText = getHeaderText;
    component.getOptions = getOptions;
    component.getQuestionType = getQuestionType;
    component.getQuestionTypeDropdown = getQuestionTypeDropdown;
    component.getRandomizedCheckbox = getRandomizedCheckbox;
    component.getReorderDownBtn = getReorderDownBtn;
    component.getReorderUpBtn = getReorderUpBtn;
    component.getRichContentToggle = getRichContentToggle;
    component.isRandomized = isRandomized;
    component.setCurrentQuestion = setCurrentQuestion;
    component.setQuestionType = setQuestionType;
    component.toggleRandomized = toggleRandomized;
    component.toggleRichContent = toggleRichContent;

    //INIT
    component.composeQuestionType();

    function composeQuestionType(newQuestionType) {
        var questionType = component.questionType,
            questionTypeComponent;

        //if nothing was set initially in the question constructor, or if a question type is not being
        //supplied right now, then skip
        if (!component.questionType && !newQuestionType) {
            return;
        }
        if (newQuestionType) { //if question type is being set manually in this function
            questionType = newQuestionType;
        }

        switch(questionType) {
            case component.questionTypes.mc:
            case component.questionTypes.mcorrect:
                questionTypeComponent = new component.includes.QuestionTypeMcComponent(browserRef, component.question);
                break;
            case component.questionTypes.matrix:
                questionTypeComponent = new component.includes.QuestionTypeMatrixComponent(browser, component.question);
                break;
            case component.questionTypes.matching:
                questionTypeComponent = new component.includes.QuestionTypeMatchingComponent(browser, component.question);
                break;
            case component.questionTypes.dropdowns:
                questionTypeComponent = new component.includes.QuestionTypeDropdownsComponent(browser, component.question);
                break;
            case component.questionTypes.numerical:
                questionTypeComponent = new component.includes.QuestionTypeNumericalComponent(browser, component.question);
                break;
            case component.questionTypes.textmatch:
                questionTypeComponent = new component.includes.QuestionTypeTextmatchComponent(browser, component.question);
                break;
        }
        //to compose behavior, merge the newly created object based on question type with the current object
        component = Object.assign(component, questionTypeComponent);
    }

    async function deleteOption(option) {
        await option.element(by.css(component.deleteOptionBtn)).click();
    }

    async function deleteQuestion() {
        await component.deleteBtn.click();
    }

    function getDeleteBtn() {
        return component.deleteBtn;
    }

    function getDeleteOptionBtns() {
        return component.browser.element.all(by.css(component.deleteOptionBtn));
    }

    async function getHeaderText() {
        const text = await component.headerText.getText();
        return text.toLowerCase();
    }

    function getOptions() {
        return component.options;
    }

    function getQuestionTypeDropdown() {
        return component.questionTypeDropdown;
    }

    async function getQuestionType() {
        return await component.questionTypeDropdown.element(by.css('option:checked')).getText();
    }

    function getRandomizedCheckbox() {
        return component.randomizedCheckbox;
    }

    function getReorderDownBtn() {
        return component.reorderDownBtn;
    }

    function getReorderUpBtn() {
        return component.reorderUpBtn;
    }

    function getRichContentToggle() {
        return component.richContentToggle;
    }

    async function isRandomized() {
        return await component.randomizedCheckbox.getAttribute('checked');
    }

    function setCurrentQuestion(question) {
        component.question = question;
    }

    async function setQuestionType(questionType) {
        await component.questionTypeDropdown.element(by.cssContainingText('option', questionType)).click();
    }

    async function toggleRandomized() {
        await component.randomizedCheckbox.click();
    }

    async function toggleRichContent() {
        await component.richContentToggle.click();
    }
}

module.exports = EditQuestionComponent;