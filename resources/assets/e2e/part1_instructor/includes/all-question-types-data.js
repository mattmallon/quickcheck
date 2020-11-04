function AllQuestionTypesData() {
    this.verify = verify;

    async function verify(editQcPage, data) {
        describe('with top-level data', function() {
            it('should show the correct number of questions', async function() {
                await editQcPage.initQuestions();
                expect(await editQcPage.getQuestions().count()).toBe(7);
            });
        });

        describe('with a multiple choice question', function() {
            var question,
                questionData,
                questionFeedback,
                questionFeedback1,
                questionFeedback2,
                questionFeedback3,
                questionFeedback4,
                options,
                option1,
                option2,
                option3,
                option4;

            beforeEach(function() {
                question = editQcPage.getQuestion(0);
                questionData = data.quizData.quiz1.question1;
                questionFeedback = question.feedback.getPerResponseFeedbackOptions();
                questionFeedback1 = questionFeedback.get(0);
                questionFeedback2 = questionFeedback.get(1);
                questionFeedback3 = questionFeedback.get(2);
                questionFeedback4 = questionFeedback.get(3);
                options = question.getOptions();
                option1 = options.get(0);
                option2 = options.get(1);
                option3 = options.get(2);
                option4 = options.get(3);
            });

            it('should show the correct answer options', async function() {
                expect(await question.getMcOptionInputValue(option1)).toBe(questionData.option1);
                expect(await question.getMcOptionInputValue(option2)).toBe(questionData.option2);
                expect(await question.getMcOptionInputValue(option3)).toBe(questionData.option3);
                expect(await question.getMcOptionInputValue(option4)).toBe(questionData.option4);
            });

            it('should show the proper correct answer', async function() {
                expect(await question.isMcOptionMarkedCorrect(option1)).toBe(false);
                expect(await question.isMcOptionMarkedCorrect(option2)).toBe(true);
                expect(await question.isMcOptionMarkedCorrect(option3)).toBe(false);
                expect(await question.isMcOptionMarkedCorrect(option4)).toBe(false);
            });

            it('should have the randomized option set if it was set before', async function() {
                expect(await question.isRandomized()).toBeTruthy();
            });

            it('should show the proper feedback', async function() {
                expect(await question.feedback.getPerResponseFeedbackText(questionFeedback1)).toBe(questionData.feedbackOption1);
                expect(await question.feedback.getPerResponseFeedbackText(questionFeedback2)).toBe(questionData.feedbackOption2);
                expect(await question.feedback.getPerResponseFeedbackText(questionFeedback3)).toBe(questionData.feedbackOption3);
                expect(await question.feedback.getPerResponseFeedbackText(questionFeedback4)).toBe(questionData.feedbackOption4);
            });
        });

        describe('with a multiple correct question', function() {
            var question,
                questionData,
                questionFeedback,
                questionFeedback1,
                questionFeedback2,
                questionFeedback3,
                questionFeedback4,
                options,
                option1,
                option2,
                option3,
                option4;

            beforeEach(function() {
                question = editQcPage.getQuestion(1);
                questionData = data.quizData.quiz1.question2;
                questionFeedback = question.feedback.getPerResponseFeedbackOptions();
                questionFeedback1 = questionFeedback.get(0);
                questionFeedback2 = questionFeedback.get(1);
                questionFeedback3 = questionFeedback.get(2);
                questionFeedback4 = questionFeedback.get(3);
                options = question.getOptions();
                option1 = options.get(0);
                option2 = options.get(1);
                option3 = options.get(2);
                option4 = options.get(3);
            });

            it('should show the correct answer options', async function() {
                expect(await question.getMcOptionInputValue(option1)).toBe(questionData.option1);
                expect(await question.getMcOptionInputValue(option2)).toBe(questionData.option2);
                expect(await question.getMcOptionInputValue(option3)).toBe(questionData.option3);
                expect(await question.getMcOptionInputValue(option4)).toBe(questionData.option4);
            });

            it('should show the proper correct answer', async function() {
                expect(await question.isMcOptionMarkedCorrect(option1)).toBe(true);
                expect(await question.isMcOptionMarkedCorrect(option2)).toBe(true);
                expect(await question.isMcOptionMarkedCorrect(option3)).toBe(false);
                expect(await question.isMcOptionMarkedCorrect(option4)).toBe(false);
            });

            it('should have the randomized option not set if it was not before', async function() {
                expect(await question.isRandomized()).toBeFalsy();
            });

            it('should show the proper feedback', async function() {
                expect(await question.feedback.getPerResponseFeedbackText(questionFeedback1)).toBe(questionData.feedbackOption1);
                expect(await question.feedback.getPerResponseFeedbackText(questionFeedback2)).toBe(questionData.feedbackOption2);
                expect(await question.feedback.getPerResponseFeedbackText(questionFeedback3)).toBe(questionData.feedbackOption3);
                expect(await question.feedback.getPerResponseFeedbackText(questionFeedback4)).toBe(questionData.feedbackOption4);
            });
        });

        describe('with a matrix question', function() {
            var checkboxes,
                correctFeedback,
                incorrectFeedback,
                question,
                questionData,
                textInputs;

            beforeEach(function() {
                question = editQcPage.getQuestion(2);
                questionData = data.quizData.quiz1.question3;
                textInputs = question.getMatrixTextInputs();
                checkboxes = question.getMatrixCheckboxes();
                correctFeedback = question.feedback.getCorrectFeedback();
                incorrectFeedback = question.feedback.getIncorrectFeedback();
            });

            it('should show the correct answer options', async function() {
                expect(await textInputs.get(0).getAttribute('value')).toBe(questionData.column1);
                expect(await textInputs.get(1).getAttribute('value')).toBe(questionData.column2);
                expect(await textInputs.get(2).getAttribute('value')).toBe(questionData.row1);
                expect(await textInputs.get(3).getAttribute('value')).toBe(questionData.row2);
            });

            it('should show the proper correct answers', async function() {
                expect(await checkboxes.get(0).getAttribute('checked')).toBeTruthy();
                expect(await checkboxes.get(1).getAttribute('checked')).toBeFalsy();
                expect(await checkboxes.get(2).getAttribute('checked')).toBeFalsy();
                expect(await checkboxes.get(3).getAttribute('checked')).toBeTruthy();
            });

            it('should show correct and incorrect feedback when it is present', async function() {
                expect(await correctFeedback.getAttribute('value')).toBe(questionData.feedbackCorrect);
                expect(await incorrectFeedback.getAttribute('value')).toBe(questionData.feedbackIncorrect);
            });
        });

        describe('with a matching question', function() {
            var question,
                questionData,
                distractors,
                matchingPrompts,
                matchingPairInputs,
                feedbackPanel;

            beforeEach(function() {
                question = editQcPage.getQuestion(3);
                questionData = data.quizData.quiz1.question4;
                distractors = question.getDistractors();
                matchingPrompts = question.getMatchingPrompts();
                matchingPairInputs = question.getMatchingPairInputs();
                feedbackPanel = question.feedback.getFeedbackPanel();
            });

            it('should show the correct answer options', async function() {
                expect(await matchingPrompts.count()).toBe(2);
                expect(await matchingPairInputs.get(0).getAttribute('value')).toBe(questionData.prompt1);
                expect(await matchingPairInputs.get(1).getAttribute('value')).toBe(questionData.answer1);
                expect(await matchingPairInputs.get(2).getAttribute('value')).toBe(questionData.prompt2);
                expect(await matchingPairInputs.get(3).getAttribute('value')).toBe(questionData.answer2);
            });

            it('should show the correct distractors', async function() {
                expect(await distractors.count()).toBe(1);
                expect(await question.getDistractorInput(distractors.get(0)).getAttribute('value')).toBe(questionData.distractor);
            });

            it('should not be randomized if not previously set', async function() {
                expect(await question.isRandomized()).toBeFalsy();
            });

            it('should not have feedback if not previously set', async function() {
                expect(await feedbackPanel.isPresent()).toBe(false);
            });
        });

        describe('with a multiple dropdowns question', function() {
            var question,
                questionData,
                distractors,
                matchingPrompts,
                matchingPairInputs,
                feedbackPanel;

            beforeEach(function() {
                question = editQcPage.getQuestion(4);
                questionData = data.quizData.quiz1.question5;
                distractors = question.getDistractors();
                dropdownPrompts = question.getDropdownPrompts();
                dropdownInputs = question.getDropdownTextInputs();
                feedbackPanel = question.feedback.getFeedbackPanel();
            });

            it('should show the correct answer options', async function() {
                expect(await dropdownPrompts.count()).toBe(2);
                expect(await dropdownInputs.get(0).getAttribute('value')).toBe(questionData.prompt1);
                expect(await dropdownInputs.get(1).getAttribute('value')).toBe(questionData.answer1);
                expect(await dropdownInputs.get(2).getAttribute('value')).toBe(questionData.prompt2);
                expect(await dropdownInputs.get(3).getAttribute('value')).toBe(questionData.answer2);
            });

            it('should show the correct distractors', async function() {
                expect(await distractors.count()).toBe(1);
                expect(await question.getDistractorInput(distractors.get(0)).getAttribute('value')).toBe(questionData.distractor);
            });

            it('should not have feedback if not previously set', async function() {
                expect(await feedbackPanel.isPresent()).toBe(false);
            });
        });

        describe('with a textmatch question', function() {
            var question,
                questionData,
                options,
                feedbackPanel;

            beforeEach(function() {
                question = editQcPage.getQuestion(5);
                questionData = data.quizData.quiz1.question6;
                options = question.getOptions();
                feedbackPanel = question.feedback.getFeedbackPanel();
            });

            it('should show the correct answer options', async function() {
                expect(await options.count()).toBe(1);
                expect(await question.getOptionInput(options.get(0)).getAttribute('value')).toBe(questionData.option1);
            });

            it('should not have feedback if not previously set', async function() {
                expect(await feedbackPanel.isPresent()).toBe(false);
            });
        });

        describe('with a numerical question', function() {
            var question,
                questionData,
                options,
                feedbackPanel;

            beforeEach(function() {
                question = editQcPage.getQuestion(6);
                questionData = data.quizData.quiz1.question7;
                options = question.getOptions();
                feedbackPanel = question.feedback.getFeedbackPanel();
            });

            it('should show the correct answer options', async function() {
                var option = options.get(0);
                expect(await options.count()).toBe(1);
                expect(await question.getExactAnswerInput(option).getAttribute('value')).toBe(questionData.option1);
                expect(await question.getMarginOfErrorInput(option).getAttribute('value')).toBe('0');
            });

            it('should not have feedback if not previously set', async function() {
                expect(await feedbackPanel.isPresent()).toBe(false);
            });
        });
    }
}

module.exports = AllQuestionTypesData;