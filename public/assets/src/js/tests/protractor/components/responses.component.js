var ResponsesComponent = function(browserRef) {
    var component = this;
    component.browser = browserRef;

    //elements
    component.backLink = component.browser.element(by.partialLinkText('Back to attempts'));
    component.countCorrect = component.browser.element(by.css('.qc-attempt-questions-correct'));
    component.questions = component.browser.element.all(by.repeater('currentQuestion in vm.questions'));
    component.responseErrors = component.browser.element.all(by.css('.qc-error-message'));
    component.score = component.browser.element(by.css('.qc-attempt-percentage-score'));

    //string sub-references
    component.correctOptionClass = 'qc-correct-answer-marked';
    component.correctMatrixClass = '.qc-correct-text';
    component.correctQuestionClass = '.panel-success';
    component.dropdownCorrectArea = '.qc-correct-dropdown-answer';
    component.dropdownCorrectPrompts = 'label';
    component.dropdownCorrectSelects = 'select';
    component.dropdownPrompts = 'label';
    component.incorrectQuestionClass = '.panel-danger';
    component.incorrectInputClass = 'qc-incorrect-answer-input';
    component.matchingCorrectAnswers = 'tbody tr td:last-of-type';
    component.matchingPrompts = 'label';
    component.matrixCell = 'tbody tr td:not(:first-of-type)';
    component.matrixCheckboxes = 'input[type="checkbox"]';
    component.matrixColumns = 'column in currentQuestion.columns';
    component.matrixRows = 'tbody tr td:first-of-type';
    component.mcOptions = 'answerOption in currentQuestion.options';
    component.numericalAnswer = 'input';
    component.numericalCorrect = '.qc-correct-answer-input';
    component.numericalCorrectAnswers = 'option in currentQuestion.options';
    component.selectedOption = 'option:checked';
    component.questionText = '.qc-assessment-question';
    component.textmatchAnswer = 'input';
    component.textmatchCorrect = '.qc-correct-answer-input';
    component.textmatchCorrectAnswers = 'option in currentQuestion.options';

    //functions
    component.getCountCorrect = getCountCorrect;
    component.getDropdownCorrectAnswerArea = getDropdownCorrectAnswerArea;
    component.getDropdownCorrectAnswerPrompts = getDropdownCorrectAnswerPrompts;
    component.getDropdownCorrectAnswerSelects = getDropdownCorrectAnswerSelects;
    component.getDropdownPrompts = getDropdownPrompts;
    component.getMatchingCorrectAnswers = getMatchingCorrectAnswers;
    component.getMatchingPrompts = getMatchingPrompts;
    component.getMatrixCheckboxes = getMatrixCheckboxes;
    component.getMatrixColumns = getMatrixColumns;
    component.getMatrixOptionCells = getMatrixOptionCells;
    component.getMatrixRowLabels = getMatrixRowLabels;
    component.getMcOptions = getMcOptions;
    component.getNumericalAnswer = getNumericalAnswer;
    component.getNumericalAnswers = getNumericalAnswers;
    component.getQuestions = getQuestions;
    component.getQuestionText = getQuestionText;
    component.getResponseErrors = getResponseErrors;
    component.getSelectedOptionFromDropdown = getSelectedOptionFromDropdown;
    component.getSelects = getSelects;
    component.getScore = getScore;
    component.getTextmatchAnswer = getTextmatchAnswer;
    component.getTextMatchAnswers = getTextMatchAnswers;
    component.goBack = goBack;
    component.isInputMarkedIncorrect = isInputMarkedIncorrect;
    component.isMatrixOptionMarkedCorrect = isMatrixOptionMarkedCorrect;
    component.isNumericalAnswerCorrect = isNumericalAnswerCorrect;
    component.isOptionChecked = isOptionChecked;
    component.isMcOptionMarkedCorrect = isMcOptionMarkedCorrect;
    component.isResponseCorrect = isResponseCorrect;
    component.isResponseIncorrect = isResponseIncorrect;
    component.isTextmatchAnswerCorrect = isTextmatchAnswerCorrect;

    function getCountCorrect() {
        return component.countCorrect.getText();
    }

    function getDropdownCorrectAnswerArea(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return component.browser.element(by.css(component.dropdownCorrectArea));
    }

    function getDropdownCorrectAnswerPrompts(questionIndex) {
        var correctArea = component.getDropdownCorrectAnswerArea(questionIndex);
        return correctArea.all(by.css(component.dropdownCorrectPrompts));
    }

    function getDropdownCorrectAnswerSelects(questionIndex) {
        var correctArea = component.getDropdownCorrectAnswerArea(questionIndex);
        return correctArea.all(by.css(component.dropdownCorrectSelects));
    }

    function getDropdownPrompts(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.css(component.dropdownPrompts));
    }

    function getMatchingCorrectAnswers(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.css(component.matchingCorrectAnswers));
    }

    function getMatchingPrompts(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.css(component.matchingPrompts));
    }

    function getMatrixCheckboxes(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.css(component.matrixCheckboxes));
    }

    function getMatrixColumns(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.repeater(component.matrixColumns));
    }

    function getMatrixOptionCells(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.css(component.matrixCell));
    }

    function getMatrixRowLabels(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.css(component.matrixRows));
    }

    function getMcOptions(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.repeater(component.mcOptions));
    }

    function getNumericalAnswer(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.element(by.css(component.numericalAnswer)).getAttribute('value');
    }

    function getNumericalAnswers(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.repeater(component.numericalCorrectAnswers));
    }

    function getQuestions() {
        return component.questions;
    }

    function getQuestionText(questionIndex) {
        return component.getQuestions().get(questionIndex).element(by.css(component.questionText)).getText();
    }

    function getResponseErrors() {
        return component.responseErrors;
    }

    function getSelectedOptionFromDropdown(select) {
        return select.element(by.css(component.selectedOption)).getText();
    }

    function getSelects(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.css('select'));
    }

    function getScore() {
        return component.score.getText();
    }

    function getTextmatchAnswer(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.element(by.css(component.textmatchAnswer)).getAttribute('value');
    }

    function getTextMatchAnswers(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.all(by.repeater(component.textmatchCorrectAnswers));
    }

    function goBack() {
        component.backLink.click();
    }

    function isInputMarkedIncorrect(questionIndex) {
        var question = component.getQuestions().get(questionIndex);

        return question.element(by.css('input')).getAttribute('class').then(function(className) {
            if (className.indexOf(component.incorrectInputClass) > -1) {
                return true;
            }
            else {
                return false;
            }
        });
    }

    function isMatrixOptionMarkedCorrect(tableCell) {
        return tableCell.element(by.css(component.correctMatrixClass)).isPresent();
    }

    function isOptionChecked(option) {
        return option.element(by.css('input')).getAttribute('checked').then(function(checked) {
            if (checked) {
                return true;
            }
            else {
                return false;
            }
        });
    }

    function isMcOptionMarkedCorrect(option) {
        return option.getAttribute('class').then(function(className) {
            if (className.indexOf(component.correctOptionClass) > -1) {
                return true;
            }
            else {
                return false;
            }
        });
    }

    function isNumericalAnswerCorrect(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.element(by.css(component.numericalCorrect)).isPresent();
    }

    function isResponseCorrect(question) {
        return question.element(by.css(component.correctQuestionClass)).isPresent();
    }

    function isResponseIncorrect(question) {
        return question.element(by.css(component.incorrectQuestionClass)).isPresent();
    }

    function isTextmatchAnswerCorrect(questionIndex) {
        var question = component.getQuestions().get(questionIndex);
        return question.element(by.css(component.textmatchCorrect)).isPresent();
    }
}

module.exports = ResponsesComponent;