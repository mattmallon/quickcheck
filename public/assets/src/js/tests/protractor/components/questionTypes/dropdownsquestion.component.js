var DropdownsQuestionComponent = function(browserRef, question) {
    var component = this;
    component.browser = browserRef;
    component.question = question;

    //elements
    component.addDistractorBtn = component.question.element(by.partialButtonText('Add distractor'));
    component.addDropdownPairBtn = component.question.element(by.partialButtonText('Add dropdown pair'));
    component.distractors = component.question.all(by.repeater('distractor in vm.question.distractors'));
    component.dropdownPrompts = component.question.all(by.repeater('prompt in vm.question.prompts'));
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

    function addDistractor() {
        component.addDistractorBtn.click();
    }

    function addDropdownPair() {
        component.addDropdownPairBtn.click();
    }

    function enterDistractor(distractor, text) {
        distractor.element(by.css('input[type="text"]')).sendKeys(text);
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