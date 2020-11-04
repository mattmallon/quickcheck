var McQuestionComponent = function(browserRef, question) {
    var component = this;
    component.browser = browserRef;
    component.question = question;

    //elements
    component.addMcOptionBtn = component.question.element(by.partialButtonText('Add option'));
    //strings for sub-elements
    component.inputElement = 'input';
    component.mcIsCorrectClass = '.qc-selected-correct';
    component.mcMarkCorrectClass = '.qc-correct-symbol';

    //functions
    component.addMcOption = addMcOption;
    component.enterMcTextOption = enterMcTextOption;
    component.getMcOptionInputValue = getMcOptionInputValue;
    component.getOptionInput = getOptionInput;
    component.getOptionToggleCorrect = getOptionToggleCorrect;
    component.isMcOptionMarkedCorrect = isMcOptionMarkedCorrect;
    component.toggleMcOptionCorrect = toggleMcOptionCorrect;

    async function addMcOption() {
        await component.addMcOptionBtn.click();
    }

    async function enterMcTextOption(option, text) {
        await option.element(by.css(component.inputElement)).sendKeys(text);
    }

    async function getMcOptionInputValue(option) {
        return await option.element(by.css(component.inputElement)).getAttribute('value');
    }

    function getOptionInput(option) {
        return option.element(by.css(component.inputElement));
    }

    function getOptionToggleCorrect(option) {
        return option.element(by.css(component.mcMarkCorrectClass));
    }

    async function isMcOptionMarkedCorrect(option) {
        return await option.element(by.css(component.mcIsCorrectClass)).isPresent();
    }

    async function toggleMcOptionCorrect(option) {
        await option.element(by.css(component.mcMarkCorrectClass)).click();
    }
}

module.exports = McQuestionComponent;