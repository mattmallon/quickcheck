var DropdownsQuestionComponent = function(browserRef, question) {
    var component = this;
    component.browser = browserRef;
    component.question = question;

    //elements
    component.addDistractorBtn = component.question.element(by.partialButtonText('Add distractor'));
    component.addDropdownPairBtn = component.question.element(by.partialButtonText('Add dropdown pair'));
    component.distractors = component.question.all(by.css('.qc-edit-dropdown-distractor'));
    component.dropdownPrompts = component.question.all(by.css('.qc-edit-dropdown-prompt'));
    component.dropdownTextInputs = component.question.all(by.css('table input[type="text"]'));

    //strings for sub-elements
    component.distractorInputElement = 'input';

    //functions
    component.addDistractor = addDistractor;
    component.addDropdownPair = addDropdownPair;
    component.enterDistractor = enterDistractor;
    component.getDistractors = getDistractors;
    component.getDistractorInput = getDistractorInput;
    component.getDropdownPrompts = getDropdownPrompts;
    component.getDropdownTextInputs = getDropdownTextInputs;

    async function addDistractor() {
        await component.addDistractorBtn.click();
    }

    async function addDropdownPair() {
        await component.addDropdownPairBtn.click();
    }

    async function enterDistractor(distractor, text) {
        await distractor.element(by.css('input[type="text"]')).sendKeys(text);
    }

    function getDistractors() {
        return component.distractors;
    }

    function getDistractorInput(distractor) {
        return distractor.element(by.css(component.distractorInputElement));
    }

    function getDropdownPrompts() {
        return component.dropdownPrompts;
    }

    function getDropdownTextInputs() {
        return component.dropdownTextInputs;
    }
}

module.exports = DropdownsQuestionComponent;