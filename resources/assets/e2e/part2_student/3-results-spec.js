var browser2 = browser.params.browser2,
    includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser2),
    studentHomePage = new includes.StudentHomePage(browser2),
    EC = protractor.ExpectedConditions;

describe('Viewing results as a student', function() {
    var quiz1 = data.sets.featuresAllOn.quickchecks.featuresAllOn,
        quiz2 = data.sets.featuresAllOff.quickchecks.urlEmbed,
        quiz3 = data.sets.featuresAllOff.quickchecks.featuresAllOffPastDue,
        quiz4 = data.sets.featuresAllOff.quickchecks.resultsNotReleased;

    describe('on the home/overview page', function() {
        var releases;

        it('should show a list of all released quizzes where the student had made at least one attempt', async function() {
            await common.switchToCanvas();
            await common.goToQuickCheck();

            releases = studentHomePage.getReleases();
            expect(await releases.count()).toBe(3);
            expect(await releases.get(0).getText()).toBe(quiz1);
            expect(await releases.get(1).getText()).toBe(quiz2);
            expect(await releases.get(2).getText()).toBe(quiz3);
        });

        it('should allow searching for a quiz regardless of case', async function() {
            await studentHomePage.search(quiz1.toUpperCase());
            const releases = await studentHomePage.getDisplayedReleases();
            expect(releases.length).toBe(1);
        });

        it('should not show any quizzes when searching for text that does not match', async function() {
            await studentHomePage.search('random text here');
            const releases = await studentHomePage.getDisplayedReleases();
            expect(releases.length).toBe(0);
        });

        it('should show all results again after the search text has been erased', async function() {
            await studentHomePage.clearSearch();
            const releases = await studentHomePage.getDisplayedReleases();
            expect(releases.length).toBe(3);
        });
    });

    describe('when reviewing attempts on the quiz with all question types', function() {
        var attempts;

        it('should show the correct number of attempts', async function() {
            //test student had 1 empty attempt and 2 actual attempts; at the moment, even when the feature is
            //turned on to hide empty attempts, we are still displaying all for students, as the point of the
            //feature is really to de-clutter the instructor view with large courses
            await studentHomePage.getReleases().get(0).click();
            attempts = studentHomePage.attempts.getAttempts();
            expect(await attempts.count()).toBe(3);
        });

        //NOTE: some things we can't really test...can't get exact timestamps to test against, for instance
        it('should show the proper correct counts for all attempts', async function() {
            var correctCounts = [ '0', '0', '7' ];

            for (let [index, correctCount] of correctCounts.entries()) {
                expect(await studentHomePage.attempts.getCorrect(index)).toBe(correctCounts[index]);
            }
        });

        it('should show the proper incorrect counts for all attempts', async function() {
            var incorrectCounts = [ '0', '7', '0' ];

            for (let [index, incorrectCount] of incorrectCounts.entries()) {
                expect(await studentHomePage.attempts.getIncorrect(index)).toBe(incorrectCounts[index]);
            }
        });

        it('should show the proper score for all attempts', async function() {
            var scores = [ '0%', '0%', '100%' ];

            for (let [index, score] of scores.entries()) {
                expect(await studentHomePage.attempts.getScore(index)).toBe(scores[index]);
            }
        });

        it('should show the complete checkmark for finished attempts', async function() {
            var isCompletes = [ false, true, true ];

            for (let [index, isComplete] of isCompletes.entries()) {
                expect(await studentHomePage.attempts.isCompleted(index)).toBe(isCompletes[index]);
            }
        });

        it('should not show the past due icon if the attempt was completed before the due date', async function() {
            var i;

            for (i = 0; i < 3; i++) {
                expect(await studentHomePage.attempts.isPastDue(i)).toBe(false);
            }
        });

        it('should show the responses button when the show responses feature is turned on', async function() {
            expect(await studentHomePage.attempts.getResponsesBtn(1).isDisplayed()).toBe(true);
            expect(await studentHomePage.attempts.getResponsesBtn(2).isDisplayed()).toBe(true);
        });

        it('should hide the responses button if no responses for an attempt', async function() {
            expect(await studentHomePage.attempts.getResponsesBtn(0).isPresent()).toBe(false);
        });
    });

    describe('when reviewing responses on the quiz with all question types', function() {
        //navigate to responses for attempt with all incorrect
        it ('should show the correct score', async function() {
            await studentHomePage.attempts.getResponsesBtn(1).click();
            expect(await studentHomePage.responses.getScore()).toContain('0%');
        });

        it('should show count correct', async function() {
            expect(await studentHomePage.responses.getCountCorrect()).toContain('0 / 7 correct');
        });

        it('should show all questions as being incorrect in the responses view with a red header and x', async function() {
            await studentHomePage.responses.getQuestions().each(async function(question) {
                expect(await studentHomePage.responses.isResponseIncorrect(question)).toBe(true);
            });
        });

        //we're going to do the bulk of our testing in the quiz with all correct answers, but there are a few things that only
        //show up when questions are answered incorrectly
        it('should show the correct dropdown answer when the student answers incorrectly', async function() {
            var correctAnswerArea = studentHomePage.responses.getDropdownCorrectAnswerArea(4);

            expect(await correctAnswerArea.isDisplayed()).toBe(true);
        });

        it('should show the correct dropdown prompts', async function() {
            var correctAnswerPrompts = studentHomePage.responses.getDropdownCorrectAnswerPrompts(4),
                questionData = data.quizData.quiz1.question5;

            expect(await correctAnswerPrompts.get(0).getText()).toBe(questionData.prompt1);
            expect(await correctAnswerPrompts.get(1).getText()).toBe(questionData.prompt2);
        });

        it('should show the correct dropdown answers', async function() {
            var correctAnswerSelects = studentHomePage.responses.getDropdownCorrectAnswerSelects(4),
                questionData = data.quizData.quiz1.question5,
                select1 = correctAnswerSelects.get(0),
                select2 = correctAnswerSelects.get(1),
                selectOption1 = studentHomePage.responses.getSelectedOptionFromDropdown(select1),
                selectOption2 = studentHomePage.responses.getSelectedOptionFromDropdown(select2);

            expect(await selectOption1).toBe(questionData.answer1);
            expect(await selectOption2).toBe(questionData.answer2);
        });

        it('should mark textmatch answers as incorrect', async function() {
            expect(await studentHomePage.responses.isInputMarkedIncorrect(5)).toBe(true);
        });

        it('should mark numerical answers as incorrect', async function() {
            expect(await studentHomePage.responses.isInputMarkedIncorrect(6)).toBe(true);
        });

        //navigate to responses for attempt with all correct
        it('should show all questions as being correct in the responses view', async function() {
            await studentHomePage.responses.goBack();
            await studentHomePage.attempts.getResponsesBtn(2).click();
            await studentHomePage.responses.getQuestions().each(async function(question, index) {
                expect(await studentHomePage.responses.isResponseCorrect(question)).toBe(true);
            });
        });

        describe('for a multiple choice question', function() {
            var questionData = data.quizData.quiz1.question1;

            //we're going to run the tests in the quiz with all answers that were correct, so it will be easy for us to test that
            //the student selections are accurate (in the all-incorrect quiz, we just tested by clicking something NOT the correct answer,
            //and due to the randomization of options, that could be just about any option)
            it('should show the question text correctly', async function() {
                expect(await studentHomePage.responses.getQuestionText(0)).toBe(questionData.questionText);
            });

            it('should show the options correctly', async function() {
                var options = studentHomePage.responses.getMcOptions(0),
                    optionItems = [ questionData.option1, questionData.option2, questionData.option3, questionData.option4 ];

                await options.each(async function(option, index) {
                    expect(await option.getText()).toContain(optionItems[index]);
                });
            });

            it('should show how the student responded', async function() {
                var option = studentHomePage.responses.getMcOptions(0).get(1);
                expect(await studentHomePage.responses.isOptionChecked(option)).toBe(true);
            });

            it('should indicate the correct answer', async function() {
                var option = studentHomePage.responses.getMcOptions(0).get(1);
                expect(await studentHomePage.responses.isMcOptionMarkedCorrect(option)).toBe(true);
            });
        });

        describe('for a multiple correct question', function() {
            var questionData = data.quizData.quiz1.question2,
                options = studentHomePage.responses.getMCorrectOptions(1),
                optionItems = [ questionData.option1, questionData.option2, questionData.option3, questionData.option4 ],
                correctOptions = [ options.get(0), options.get(1) ];

            it('should show the options correctly', async  function() {
                await options.each(async function(option, index) {
                    expect(await option.getText()).toContain(optionItems[index]);
                });
            });

            it('should show how the student responded', async function() {
                for (let correctOption of correctOptions) {
                    expect(await studentHomePage.responses.isOptionChecked(correctOption)).toBe(true);
                }
            });

            it('should indicate the correct answers', async function() {
                for (let correctOption of correctOptions) {
                    expect(await studentHomePage.responses.isMcOptionMarkedCorrect(correctOption)).toBe(true);
                }
            });
        });

        describe('for a matrix question', function() {
            var questionData = data.quizData.quiz1.question3,
                answers = [ questionData.answer1, questionData.answer2 ],
                columns = studentHomePage.responses.getMatrixColumns(2),
                columnItems = [ questionData.column1, questionData.column2 ],
                rows = studentHomePage.responses.getMatrixRowLabels(2),
                rowItems = [ questionData.row1, questionData.row2 ],
                tableCells = studentHomePage.responses.getMatrixOptionCells(2);

            it('should show the columns correctly', async function() {
                for (let [index, columnItem] of columnItems.entries()) {
                    expect(await columns.get(index).getText()).toBe(columnItem);
                }
            });

            it('should show the rows correctly', async function() {
                for (let [index, rowItem] of rowItems.entries()) {
                    expect(await rows.get(index).getText()).toBe(rowItem);
                }
            });

            it('should show how the student responded', async function() {
                for (let [index, answer] of answers.entries()) {
                    expect(await studentHomePage.responses.isOptionChecked(tableCells.get(answer))).toBe(true);
                }
            });

            it('should indicate the correct answers', async function() {
                for (let [index, answer] of answers.entries()) {
                    expect(await studentHomePage.responses.isMatrixOptionMarkedCorrect(tableCells.get(answer))).toBe(true);
                }
            });
        });

        describe('for a matching question', function() {
            var questionData = data.quizData.quiz1.question4,
                correctAnswers = studentHomePage.responses.getMatchingCorrectAnswers(3),
                correctAnswerItems = [ questionData.answer1, questionData.answer2 ],
                prompts = studentHomePage.responses.getMatchingPrompts(3),
                promptItems = [ questionData.prompt1, questionData.prompt2 ],
                selects = studentHomePage.responses.getSelects(3);

            it('should show the prompts correctly', async function() {
                for (let [index, promptItem] of promptItems.entries()) {
                    expect(await prompts.get(index).getText()).toBe(promptItem);
                }
            });

            it('should show how the student responded', async function() {
                for (let [index, correctAnswerItem] of correctAnswerItems.entries()) {
                    expect(await common.getSelectedText(selects.get(index))).toBe(correctAnswerItem);
                }
            });

            it('should indicate the correct answers', async function() {
                await correctAnswers.each(async function(correctAnswer, index) {
                    expect(await correctAnswer.getText()).toBe(correctAnswerItems[index]);
                });
            });
        });

        describe('for a multiple dropdown question', function() {
            var questionData = data.quizData.quiz1.question5,
                correctAnswerItems = [ questionData.answer1, questionData.answer2 ],
                prompts = studentHomePage.responses.getDropdownPrompts(4),
                promptItems = [ questionData.prompt1, questionData.prompt2 ],
                selects = studentHomePage.responses.getSelects(4);

            it('should show the dropdown prompts correctly', async function() {
                for (let [index, promptItem] of promptItems.entries()) {
                    expect(await prompts.get(index).getText()).toBe(promptItem);
                }
            });

            it('should show how the student responded', async function() {
                for (let [index, correctAnswerItem] of correctAnswerItems.entries()) {
                    expect(await common.getSelectedText(selects.get(index))).toBe(correctAnswerItem);
                }
            });
        });

        describe('for a textmatch question', function() {
            var questionData = data.quizData.quiz1.question6,
                answers = studentHomePage.responses.getTextMatchAnswers(5);

            it('should show how the student responded', async function() {
                expect(await studentHomePage.responses.getTextmatchAnswer(5)).toBe(questionData.option1.toLowerCase() + '!    ');
            });

            it('should indicate the student answer was correct', async function() {
                expect(await studentHomePage.responses.isTextmatchAnswerCorrect(5)).toBe(true);
            });

            it('should show all correct answers', async function() {
                expect(await answers.count()).toBe(1);
                expect(await answers.get(0).getText()).toBe(questionData.option1);
            });
        });

        describe('for a numerical question', function() {
            var questionData = data.quizData.quiz1.question7,
                answers = studentHomePage.responses.getNumericalAnswers(6);

            it('should show how the student responded', async function() {
                expect(await studentHomePage.responses.getNumericalAnswer(6)).toBe(questionData.answerKey);
            });

            it('should indicate the student answer was correct', async function() {
                expect(await studentHomePage.responses.isNumericalAnswerCorrect(6)).toBe(true);
            });

            it('should show all correct answers', async function() {
                expect(await answers.count()).toBe(1);
                expect(await answers.get(0).getText()).toContain(questionData.answerKey);
            });
        });
    });

    describe('when reviewing in a quiz with responses hidden and past due', function() {
        it('should show the correct number of attempts', async function() {
            var attempts;

            await studentHomePage.responses.goBack();
            await studentHomePage.attempts.goBack();
            await studentHomePage.getReleases().get(2).click();
            attempts = studentHomePage.attempts.getAttempts();
            expect(await attempts.count()).toBe(5);
        });

        it('should hide the responses button when the show responses in student view feature is turned off', async function() {
            expect(await studentHomePage.attempts.getResponsesBtn(1).isPresent()).toBe(false);
        });

        it('should show the past due icon if the attempt was completed after the due date', async function() {
            expect(await studentHomePage.attempts.isPastDue(1)).toBe(true);
        });
    });

    //going to assume that if all results appear correctly for this first quiz, that they will for the other quizzes taken
});