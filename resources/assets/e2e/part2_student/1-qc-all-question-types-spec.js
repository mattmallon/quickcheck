browser.params.browser2 = browser.forkNewDriverInstance(); //fork new browser instance for student
var browser2 = browser.params.browser2, //define browser instance globally to share across files
    includes = require('../common/includes.js'),
    canvasAssignmentsPage = new includes.CanvasAssignmentsPage(browser2),
    canvasLoginPage = new includes.CanvasLoginPage(browser2),
    common = new includes.Common(browser2),
    creds = includes.userCreds,
    data = includes.data,
    qcPage = new includes.QcPage(browser2);

describe('Navigating to the quick check', function() {
    var qcName;

    beforeEach(function() {
        qcName = data.sets.featuresAllOn.quickchecks.featuresAllOn;
    });

    it('should log in to Canvas and find the assignment', async function() {
        await common.enterNonAngularPage();
        await canvasLoginPage.login(creds.student.username, creds.student.password);
        await common.enterNonAngularPage(); //9/26/19: for some reason protractor needed this a second time, otherwise failed right away
        await browser2.sleep(5000); //MM, 10/28/20: intermittent failures here from page not loading yet, give it time
        await canvasAssignmentsPage.goToAssignments();
        await browser2.sleep(5000); //MM, 10/28/20: intermittent failures here from page not loading yet, give it time
        await canvasAssignmentsPage.openAssignment(qcName);
    });

    it('should show the embedded quiz', async function() {
        //navigate to page and refresh, to test feature functionality of hiding empty attempts;
        //also, save the order of the options in the first multiple choice question, so we can make
        //sure that questions are being randomized, by comparing 1st, 2nd, and 3rd attempts; a bit
        //worried that we'd get a false negative if the random order happened to coincide each attempt;
        //so by comparing across three different attempts, I'm hoping it will be an infinitesimal chance.
        //note that we have to refresh the Canvas page, if we refresh inside the iframe, then protractor
        //will refresh it AS the browser window and take us out of Canvas, rather than just refreshing the frame
        await common.switchToLtiTool();
        await common.enterAngularPage();
        await common.saveOptionList(qcPage.getMcOptions());
        await common.switchToCanvas();
        await browser2.refresh();
        await common.switchToLtiTool();
        await common.enterAngularPage();
        await common.saveOptionList(qcPage.getMcOptions());
    });
});

//get all questions wrong at first, to make sure they are marked as incorrect
describe('Taking a graded quickcheck and getting all questions incorrect', function() {
    var quizData = data.quizData.quiz1;

    it('should not show a title if it is not present', async function() {
        expect(await qcPage.getTitle().isPresent()).toBe(false);
    });

    it('should not show a description if it is not present', async function() {
        expect(await qcPage.getDescription().isPresent()).toBe(false);
    });

    it('should show the correct number of questions in the quiz', async function() {
        expect(await qcPage.getQuestionProgress()).toBe('question 1 out of 7');
    });

    it('should begin with a score of 0', async function() {
        expect(await qcPage.getScore()).toBe('0 / 7 questions correct');
    });

    describe('when on a multiple choice question', function() {
        var questionData = quizData.question1;

        it('should show the proper question text', async function() {
            expect(await qcPage.getQuestionText()).toBe(questionData.questionText);
        });

        it('should show the options correctly', async function() {
            //it's a bit tricky to check the exact question text for each option when the order is randomized,
            //so things look a little gnarly below. have to run through each possible option to see if it is there.
            var options = qcPage.getMcOptions(),
                textOptions = [
                    questionData.option1,
                    questionData.option2,
                    questionData.option3,
                    questionData.option4
                ];
            await options.each(async function(option) {
                var optionFound = false;
                const text = await option.getText();
                textOptions.forEach(function(textOption) {
                    if (textOption == text) {
                        optionFound = true;
                    }
                });
                expect(optionFound).toBe(true);
            });
        });

        it('should disable the submit button until a multiple choice answer is selected', async function() {
            expect(await qcPage.isSubmitBtnDisabled()).toBe(true);
        });

        it('should mark the multiple choice question as incorrect when answered incorrectly', async function() {
            //since it's randomized, we have to be sure that we're not clicking the correct answer
            await qcPage.selectIncorrectRandomMcOption(questionData.answer);
            await qcPage.submit();
            expect(await qcPage.isIncorrectModal()).toBe(true);
        });

        it('should show per-response incorrect feedback for a multiple choice question if supplied', async function() {
            expect(await qcPage.getPerResponseFeedback().count()).toBe(1);
            await qcPage.clickContinue();
        });

        it('should not increment the score when the question was answered incorrectly', async function() {
            expect(await qcPage.getScore()).toBe('0 / 7 questions correct');
        });
    });

    describe('when on a multiple correct question', function() {
        var questionData = quizData.question2;

        it('should increment the question number after the first question', async function() {
            expect(await qcPage.getQuestionProgress()).toBe('question 2 out of 7');
        });

        it('should properly show the question and options', async function() {
            expect(await qcPage.getQuestionText()).toBe(''); //no question text here
            expect(await qcPage.getMCorrectOptions().count()).toBe(4);
        });

        it('should show the options in the order saved when the question is not randomized', async function() {
            var options = qcPage.getMCorrectOptions();
            expect(await options.get(0).getText()).toBe(questionData.option1);
            expect(await options.get(1).getText()).toBe(questionData.option2);
            expect(await options.get(2).getText()).toBe(questionData.option3);
            expect(await options.get(3).getText()).toBe(questionData.option4);
        });

        it('should disable the submit button until an answer is selected', async function() {
            expect(await qcPage.isSubmitBtnDisabled()).toBe(true);
        });

        it('should mark the question as incorrect when answered incorrectly', async function() {
            await qcPage.selectMCorrectOptionByIndex(0);
            await qcPage.submit();
            expect(await qcPage.isIncorrectModal()).toBe(true);
        });

        it('should show per-response incorrect feedback if supplied', async function() {
            var feedback = qcPage.getPerResponseFeedback();
            expect(await feedback.count()).toBe(1);
            expect(await feedback.get(0).getText()).toBe(questionData.feedbackOption1);
            await qcPage.clickContinue();
        });
    });

    describe('when on a matrix question', function() {
        var questionData = quizData.question3;

        it('should properly show the question', async function() {
            expect(await qcPage.getQuestionText()).toBe(''); //no question text here
        });

        it('should properly show the column text', async function() {
            var columnCells = qcPage.getMatrixColumnCells();
            expect(await columnCells.get(1).getText()).toBe(questionData.column1);
            expect(await columnCells.get(2).getText()).toBe(questionData.column2);
        });

        it('should properly show the row text', async function() {
            var rowCells = qcPage.getMatrixRowCells();
            expect(await rowCells.get(0).getText()).toBe(questionData.row1);
            expect(await rowCells.get(1).getText()).toBe(questionData.row2);
        });

        it('should have the correct number of checkboxes', async function() {
            var checkboxes = qcPage.getMatrixCheckboxes();
            expect(await checkboxes.count()).toBe(4);
        });

        it('should disable the submit button until all answers are selected', async function() {
            expect(await qcPage.isSubmitBtnDisabled()).toBe(true);
        });

        it('should only allow one selection per row', async function() {
            var checkboxes = qcPage.getMatrixCheckboxes();
            await qcPage.selectMatrixCheckboxByIndex(0);
            expect(await checkboxes.get(0).getAttribute('checked')).toBeTruthy();
            expect(await checkboxes.get(1).getAttribute('checked')).toBeFalsy();
            await qcPage.selectMatrixCheckboxByIndex(1);
            expect(await checkboxes.get(0).getAttribute('checked')).toBeFalsy();
            expect(await checkboxes.get(1).getAttribute('checked')).toBeTruthy();
            await qcPage.selectMatrixCheckboxByIndex(2);
        });

        it('should show incorrect feedback', async function() {
            await qcPage.submit();
            expect(await qcPage.isIncorrectRowFeedback()).toBe(true);
        });

        it('should show incorrect rows', async function() {
            expect(await qcPage.getIncorrectRows().count()).toBe(2);
        })

        it('should show incorrect feedback if supplied', async function() {
            expect(await qcPage.getRowFeedback().getText()).toContain(questionData.feedbackIncorrect);
            await qcPage.clickRowContinue();
        });
    });

    describe('when on a matching question', function() {
        var questionData = quizData.question4,
            matchingDistractorFirst = false;

        it('should properly show the question', async function() {
            expect(await qcPage.getQuestionText()).toBe(''); //no question text here
        });

        it('should show the prompts', async function() {
            var prompts = qcPage.getMatchingPrompts();
            expect(await prompts.get(0).getText()).toBe(questionData.prompt1);
            expect(await prompts.get(1).getText()).toBe(questionData.prompt2);
        });

        it('should show the answer options in the dropdowns', async function() {
            //ugh. so laravel will sometimes return the distractor first, sometimes last. it's sorting by a field that
            //is null for distractors. couldn't tell you why it does one, then the other. couldn't find a way to make it
            //do one or the other in the code, since we don't have a 'distractor' column. so we have to check here for
            //whether the distractor is first or last, and adjust tests accordingly. otherwise we get false negatives.
            const text = await qcPage.getSelects().get(0).getText();
            if (text === questionData.distractor) {
                matchingDistractorFirst = true;
            }

            await qcPage.getSelects().each(async function(select) {
                var options = select.all(by.css('option'));
                expect(await options.get(0).getText()).toBe(''); //blank first option for answer-switching
                if (matchingDistractorFirst) {
                    expect(await options.get(1).getText()).toBe(questionData.distractor);
                    expect(await options.get(2).getText()).toBe(questionData.answer1);
                    expect(await options.get(3).getText()).toBe(questionData.answer2);
                }
                else {
                    expect(await options.get(1).getText()).toBe(questionData.answer1);
                    expect(await options.get(2).getText()).toBe(questionData.answer2);
                    expect(await options.get(3).getText()).toBe(questionData.distractor);
                }
            });
        });

        it('should show the answer options in a row above the table', async function() {
            var selectables = qcPage.getSelectables();
            if (matchingDistractorFirst) {
                expect(await selectables.get(0).getText()).toBe(questionData.distractor);
                expect(await selectables.get(1).getText()).toBe(questionData.answer1);
                expect(await selectables.get(2).getText()).toBe(questionData.answer2);
            }
            else {
                expect(await selectables.get(0).getText()).toBe(questionData.answer1);
                expect(await selectables.get(1).getText()).toBe(questionData.answer2);
                expect(await selectables.get(2).getText()).toBe(questionData.distractor);
            }
        });

        it('should disable the submit button until all matching answers are selected', async function() {
            expect(await qcPage.isSubmitBtnDisabled()).toBe(true);
        });

        it('should gray out a matching option box after it has been selected but not the others', async function() {
            var selectables = qcPage.getSelectables();
            await qcPage.selectOption(0, questionData.answer2);
            //we selected the second option
            if (matchingDistractorFirst) {
                expect(await qcPage.isSelectablePicked(0)).toBe(false);
                expect(await qcPage.isSelectablePicked(1)).toBe(false);
                expect(await qcPage.isSelectablePicked(2)).toBe(true);
            }
            else {
                expect(await qcPage.isSelectablePicked(0)).toBe(false);
                expect(await qcPage.isSelectablePicked(1)).toBe(true);
                expect(await qcPage.isSelectablePicked(2)).toBe(false);
            }
        });

        it('should hide a matching option from future rows when the option has already been selected', async function() {
            await qcPage.getSelects().get(1).all(by.css('option')).each(async function(option) {
                const text = await option.getText();
                if (text.indexOf(questionData.answer2) > -1) {
                    expect(await option.getAttribute('hidden')).toBe('true');
                }
            });
        });

        it('should show incorrect feedback', async function() {
            await qcPage.selectOption(1, questionData.distractor);
            await qcPage.submit();
            expect(await qcPage.isIncorrectRowFeedback()).toBe(true);
        });

        it('should show incorrect rows', async function() {
            expect(await qcPage.getIncorrectRows().count()).toBe(2);
            await qcPage.clickRowContinue();
        });
    });

    describe('when on a multiple dropdowns question', function() {
        var questionData = quizData.question5;

        it('should properly show the question', async function() {
            expect(await qcPage.getQuestionText()).toBe(''); //no question text here
        });

        it('should properly display prompts', async function() {
            var prompts = qcPage.getDropdownPrompts(),
                promptLabels = [ questionData.prompt1, questionData.prompt2 ];

            await prompts.each(async function(prompt, index) {
                expect(await prompt.getText()).toBe(promptLabels[index]);
            });
        });

        it('should properly display answer options, including distractors', async function() {
            var selects = qcPage.getSelects(),
                answers = [ questionData.answer1, questionData.answer2, questionData.distractor ];

            //this is a spot where the order may change for apparently no reason from Laravel, so
            //just making sure each answer is represented somewhere, rather than a specific order
            await selects.each(async function(select) {
                for (let answer of answers) {
                    expect(await select.getText()).toContain(answer);
                }
            });
        });

        it('should show the answer options in a row above the table', async function() {
            //once again, order changes for no reason from Laravel, so run down the list
            var selectables = qcPage.getSelectables(),
                answer1Found = false,
                answer2Found = false,
                distractorFound = false;

            await selectables.each(async function(selectable) {
                const text = await selectable.getText();
                if (text.indexOf(questionData.answer1) > -1) {
                    answer1Found = true;
                }
                else if (text.indexOf(questionData.answer2) > -1) {
                    answer2Found = true;
                }
                else if (text.indexOf(questionData.distractor) > -1) {
                    distractorFound = true;
                }
            });

            expect(answer1Found).toBe(true);
            expect(answer2Found).toBe(true);
            expect(distractorFound).toBe(true);
        });

        it('should disable the submit button until all multiple dropdown answers are selected', async function() {
            expect(await qcPage.isSubmitBtnDisabled()).toBe(true);
        });

        it('should gray out an option box after it has been selected but not the others', async function() {
            //once again, since order changes from Laravel, run through the whole list
            await qcPage.selectOption(0, questionData.answer2);
            await qcPage.getSelectables().each(async function(selectable, index) {
                const text = await selectable.getText();

                if (text.indexOf(questionData.answer1) > -1) {
                    expect(await qcPage.isSelectablePicked(index)).toBe(false);
                }
                else if (text.indexOf(questionData.answer2) > -1) {
                    expect(await qcPage.isSelectablePicked(index)).toBe(true);
                }
                else if (text.indexOf(questionData.distractor) > -1) {
                    expect(await qcPage.isSelectablePicked(index)).toBe(false);
                }
            });
        });

        it('should hide an option from future rows when the option has already been selected', async function() {
            await qcPage.getSelects().get(1).all(by.css('option')).each(async function(option) {
                const text = await option.getText();
                if (text.indexOf(questionData.answer2) > -1) {
                    expect(await option.getAttribute('hidden')).toBe('true');
                }
            });
        });

        it('should mark the multiple dropdowns answer as incorrect when answered incorrectly', async function() {
            await qcPage.selectOption(1, questionData.distractor);
            await qcPage.submit();
            expect(await qcPage.isIncorrectModal()).toBe(true);
            await qcPage.clickContinue();
        });
    });

    describe('when on a textmatch question', function() {
        var questionData = quizData.question6;

        it('should properly show a textmatch question', async function() {
            expect(await qcPage.getQuestionText()).toBe(''); //no question text here
        });

        it('should disable the submit button until a textmatch answer is selected', async function() {
            expect(await qcPage.isSubmitBtnDisabled()).toBe(true);
        });

        it('should mark the textmatch answer as incorrect when answered incorrectly', async function() {
            await qcPage.enterTextmatchAnswer('Totally the wrong answer');
            await qcPage.submit();
            expect(await qcPage.isIncorrectModal()).toBe(true);
            await qcPage.clickContinue();
        });
    });

    describe('when on a numerical question', function() {
        var questionData = quizData.question7;

        it('should properly show a numeric question', async function() {
            expect(await qcPage.getQuestionText()).toBe(''); //no question text here
        });

        it('should disable the submit button until a numeric answer is selected', async function() {
            expect(await qcPage.isSubmitBtnDisabled()).toBe(true);
        });

        it('should mark the numeric question as incorrect when answered incorrectly', async function() {
            await qcPage.enterNumericalAnswer('10000000');
            await qcPage.submit();
            expect(await qcPage.isIncorrectModal()).toBe(true);
        });
    });

    describe('when the quick check is finished', function() {
        it('should show a message that the quick check has been completed', async function() {
            await qcPage.clickContinue();
            expect(await qcPage.isQcFinished()).toBe(true);
        });

        it('should show a score of 0 when all questions were answered incorrectly', async function() {
            expect(await qcPage.getFinalScore()).toBe('score: 0 / 7 questions correct');
        });

        it('should show a message that the attempt has been graded', async function() {
            expect(await qcPage.isQcGraded()).toBe(true);
        });

        it('should NOT show directions to click the module next button when not in a module', async function() {
            expect(await qcPage.isModuleMessagePresent()).toBe(false);
        });
    });
});

describe('Taking a graded quick check and getting all answers correct', function() {
    var quizData = data.quizData.quiz1;

    it('should reinitialize the quiz after clicking the restart button', async function() {
        await qcPage.restart();
        expect(await qcPage.getQuestionProgress()).toBe('question 1 out of 7');
        await common.saveOptionList(qcPage.getMcOptions());
    });

    //compare the option order in this one vs. the 2 previous attempts
    it('should randomize options when randomization is turned on', function() {
        expect(common.areOptionsRandomized()).toBe(true);
    });

    describe('when on a multiple choice question', function() {
        var questionData = quizData.question1;

        it('should mark the answer as correct when answered correctly', async function() {
            await qcPage.getMcOptions().each(async function(option, index) {
                const text = await option.getText();
                if (text.indexOf(questionData.answer) > -1) {
                    await qcPage.selectMcOptionByIndex(index);
                    await qcPage.submit();
                    expect(await qcPage.isCorrectModal()).toBe(true);
                }
            });
        });

        it('should show per-response correct feedback if supplied', async function() {
            var feedback = qcPage.getPerResponseFeedback();
            expect(await feedback.count()).toBe(1);
            expect(await feedback.first().getText()).toBe(questionData.feedbackOption2);
            await qcPage.clickContinue();
        });

        it('should increment the score after answering correctly', async function() {
            expect(await qcPage.getScore()).toBe('1 / 7 questions correct');
        });
    });

    describe('for a multiple correct question', function() {
        var questionData = quizData.question2;

        it('should mark the answer as correct when answered correctly', async function() {
            await qcPage.selectMCorrectOptionByIndex(questionData.answer1);
            await qcPage.selectMCorrectOptionByIndex(questionData.answer2);
            await qcPage.submit();
            expect(await qcPage.isCorrectModal()).toBe(true);
        });

        it('should show per-response correct feedback if supplied', async function() {
            var feedback = qcPage.getPerResponseFeedback();
            expect(await feedback.count()).toBe(2);
            expect(await feedback.get(0).getText()).toBe(questionData.feedbackOption1);
            expect(await feedback.get(1).getText()).toBe(questionData.feedbackOption2);
            await qcPage.clickContinue();
        });
    });

    describe('for a matrix question', function() {
        var questionData = quizData.question3;

        it('should mark the answer as correct when answered correctly', async function() {
            await qcPage.selectMatrixCheckboxByIndex(questionData.answer1);
            await qcPage.selectMatrixCheckboxByIndex(questionData.answer2);
            await qcPage.submit();
            expect(await qcPage.isCorrectRowFeedback()).toBe(true);
        });

        it('should not show any incorrect rows', async function() {
            expect(await qcPage.getIncorrectRows().count()).toBe(0);
        });

        it('should show question-level correct feedback if supplied', async function() {
            expect(await qcPage.getRowFeedback().getText()).toContain(questionData.feedbackCorrect);
            await qcPage.clickRowContinue();
        });
    });

    describe('for a matching question', function() {
        var questionData = quizData.question4;

        it('should mark the answer as correct when a matching question has been answered correctly', async function() {
            await qcPage.selectOption(0, questionData.answer1);
            await qcPage.selectOption(1, questionData.answer2);
            await qcPage.submit();
            expect(await qcPage.isCorrectRowFeedback()).toBe(true);
        });

        it('should not show any incorrect rows', async function() {
            expect(await qcPage.getIncorrectRows().count()).toBe(0);
            await qcPage.clickRowContinue();
        });
    });

    describe('for a multiple dropdowns question', function() {
        var questionData = quizData.question5;

        it('should mark the answer as correct when a multiple dropdown question has been answered correctly', async function() {
            await qcPage.selectOption(0, questionData.answer1);
            await qcPage.selectOption(1, questionData.answer2);
            await qcPage.submit();
            expect(await qcPage.isCorrectModal()).toBe(true);
            await qcPage.clickContinue();
        });
    });

    describe('for a textmatch question', function() {
        var questionData = quizData.question6;

        it('should mark the answer as correct when a textmatch question has been answered correctly, and match regardless of capitalization, punctuation, or trailing spaces', async function() {
            var answer = questionData.option1.toLowerCase() + '!    ';
            await qcPage.enterTextmatchAnswer(answer);
            await qcPage.submit();
            expect(await qcPage.isCorrectModal()).toBe(true);
            await qcPage.clickContinue();
        });
    });

    describe('for a numerical question', function() {
        var questionData = quizData.question7;

        it('should mark the answer as correct when a numeric question has been answered correctly', async function() {
            await qcPage.enterNumericalAnswer(questionData.option1);
            await qcPage.submit();
            expect(await qcPage.isCorrectModal()).toBe(true);
            await qcPage.clickContinue();
        });
    });

    it('should show the completion modal when finished', async function() {
        expect(await qcPage.isCompletionModalVisible()).toBe(true);
    });

    it('should show a perfect score when all answers were answered correctly', async function() {
        expect(await qcPage.getFinalScore()).toBe('score: 7 / 7 questions correct');
    });

    it('should show a message that the attempt has been graded', async function() {
        expect(await qcPage.isQcGraded()).toBe(true);
    });
});