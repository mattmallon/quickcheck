var AnalyticsComponent = function(browserRef) {
    var component = this;
    component.browser = browserRef;

    //elements
    component.attemptsCsvBtn = component.browser.element(by.css('.qc-btn-attempts-csv'));
    component.avgAttempts = component.browser.element(by.css('.qc-analytics-average-attempts'));
    component.avgTime = component.browser.element(by.css('.qc-analytics-average-time'));
    component.backBtn = component.browser.element.all(by.partialLinkText('Back')).filter(function(link) { return link.isDisplayed(); });
    component.medianScore = component.browser.element(by.css('.qc-analytics-median-score'));
    component.otherResponses = component.browser.element.all(by.repeater('response in vm.question.questionAnalytics.otherResponses'));
    component.questions = component.browser.element.all(by.repeater('question in vm.questions'));
    component.responsesCsvBtn = component.browser.element(by.css('.qc-btn-responses-csv'));
    component.totalAttempts = component.browser.element(by.css('.qc-analytics-total-attempts'));

    //strings for sub-elements
    component.dropdownAnswers = '.qc-analytics-dropdown-answer';
    component.dropdownPrompts = '.qc-analytics-dropdown-prompt';
    component.matchingAnswers = '.qc-analytics-matching-answer';
    component.matchingPrompts = '.qc-analytics-matching-prompt';
    component.matrixRows = '.qc-analytics-matrix-row';
    component.matrixColumns = '.qc-analytics-matrix-column';
    component.mcOptions = '.qc-analytics-mc-option';
    component.numericalAnswers = '.qc-analytics-numerical-answer';
    component.optionPercentages = '.qc-analytics-percentage';
    component.otherResponsesBtn = '.qc-other-responses-btn';
    component.questionPercentCorrect = '.question-percentage-score';
    component.questionText = '.qc-analytics-question-text';
    component.textmatchAnswers = '.qc-analytics-textmatch-answer';

    //functions
    component.getAttemptsCsvBtn = getAttemptsCsvBtn;
    component.getAvgAttempts = getAvgAttempts;
    component.getAvgTime = getAvgTime;
    component.getDropdownAnswers = getDropdownAnswers;
    component.getDropdownPrompts = getDropdownPrompts;
    component.getMatchingAnswers = getMatchingAnswers;
    component.getMatchingPrompts = getMatchingPrompts;
    component.getMatrixColumns = getMatrixColumns;
    component.getMatrixRows = getMatrixRows;
    component.getMedianScore = getMedianScore;
    component.getMcOptions = getMcOptions;
    component.getNumericalAnswers = getNumericalAnswers;
    component.getOptionPercentages = getOptionPercentages;
    component.getOtherResponses = getOtherResponses;
    component.getQuestions = getQuestions;
    component.getQuestionPercentCorrect = getQuestionPercentCorrect;
    component.getQuestionText = getQuestionText;
    component.getResponsesCsvBtn = getResponsesCsvBtn;
    component.getTextmatchAnswers = getTextmatchAnswers;
    component.getTotalAttempts = getTotalAttempts;
    component.goBack = goBack;
    component.toggleOtherResponses = toggleOtherResponses;

    function getAttemptsCsvBtn() {
        return component.attemptsCsvBtn;
    }

    function getAvgAttempts() {
        return component.avgAttempts.getText();
    }

    function getAvgTime() {
        return component.avgTime.getText();
    }

    function getDropdownAnswers(index) {
        return component.getQuestions().get(index).all(by.css(component.dropdownAnswers));
    }

    function getDropdownPrompts(index) {
        return component.getQuestions().get(index).all(by.css(component.dropdownPrompts));
    }

    function getMatchingAnswers(index) {
        return component.getQuestions().get(index).all(by.css(component.matchingAnswers));
    }

    function getMatchingPrompts(index) {
        return component.getQuestions().get(index).all(by.css(component.matchingPrompts));
    }

    function getMatrixColumns(index) {
        return component.getQuestions().get(index).all(by.css(component.matrixColumns));
    }

    function getMatrixRows(index) {
        return component.getQuestions().get(index).all(by.css(component.matrixRows));
    }

    function getMedianScore() {
        return component.medianScore.getText();
    }

    function getMcOptions(index) {
        return component.getQuestions().get(index).all(by.css(component.mcOptions));
    }

    function getNumericalAnswers(index) {
        return component.getQuestions().get(index).all(by.css(component.numericalAnswers));
    }

    function getOptionPercentages(index) {
        return component.getQuestions().get(index).all(by.css(component.optionPercentages));
    }

    function getOtherResponses() {
        return component.otherResponses;
    }

    function getQuestions() {
        return component.questions;
    }

    function getQuestionPercentCorrect(index) {
        return component.getQuestions().get(index).element(by.css(component.questionPercentCorrect)).getText();
    }

    function getQuestionText(index) {
        return component.getQuestions().get(index).element(by.css(component.questionText)).getText();
    }

    function getResponsesCsvBtn() {
        return component.responsesCsvBtn;
    }

    function getTextmatchAnswers(index) {
        return component.getQuestions().get(index).all(by.css(component.textmatchAnswers));
    }

    function getTotalAttempts() {
        return component.totalAttempts.getText();
    }

    function goBack() {
        component.backBtn.click();
    }

    function toggleOtherResponses(index) {
        component.getQuestions().get(index).element(by.css(component.otherResponsesBtn)).click();
    }
}

module.exports = AnalyticsComponent;