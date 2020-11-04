var MatchingQuestionComponent = function(browserRef, question) {
    var component = this,
        EC = protractor.ExpectedConditions;
    component.browser = browserRef;
    component.question = question;

    //elements
    component.addDistractorBtn = component.question.element(by.partialButtonText('Add distractor'));
    component.addMatchingPairBtn = component.question.element(by.partialButtonText('Add matching pair'));
    component.distractors = component.question.all(by.css('.qc-edit-matching-distractor'));
    component.matchingPairInputs = component.question.all(by.css('table input[type="text"]'));
    component.matchingPrompts = component.question.all(by.css('.qc-edit-matching-prompt'));

    //strings for sub-elements
    component.distractorInputElement = 'input[type="text"]';

    //functions
    component.addDistractor = addDistractor;
    component.addMatchingPair = addMatchingPair;
    component.enterDistractor = enterDistractor;
    component.getDistractors = getDistractors;
    component.getDistractorInput = getDistractorInput;
    component.getMatchingPairInputs = getMatchingPairInputs;
    component.getMatchingPrompts = getMatchingPrompts;

    async function addDistractor() {
        await component.addDistractorBtn.click();
    }

    async function addMatchingPair() {
        await component.addMatchingPairBtn.click();
    }

    async function enterDistractor(distractor, text) {
        await distractor.element(by.css(component.distractorInputElement)).sendKeys(text);
    }

    function getDistractors() {
        return component.distractors;
    }

    function getDistractorInput(distractor) {
        return distractor.element(by.css(component.distractorInputElement));
    }

    function getMatchingPairInputs() {
        return component.matchingPairInputs;
    }

    function getMatchingPrompts() {
        return component.matchingPrompts;
    }
}

module.exports = MatchingQuestionComponent;