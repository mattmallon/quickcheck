var includes = require('../common/includes.js'),
    common = new includes.Common(browser),
    data = includes.data,
    editQcPage = new includes.EditQcPage(browser),
    sets = includes.data.sets,
    setPage = new includes.SetPage(browser);

describe('Editing an assessment', function () {
    it('should show the correct assessment name', async function () {
        var subset,
            quickcheck;

        await setPage.initSubsets();
        subset = setPage.getSubset(0);
        quickcheck = subset.getQuickChecks().get(0);
        await subset.editQuickCheck(quickcheck);
        expect(await editQcPage.getAssessmentName()).toBe(sets.toBeDeleted.quickchecks.test);
    });

    it('should show the correct assessment group', async function () {
        var select = editQcPage.getSubsetSelect();
        expect(await common.getSelectedText(select)).toBe(sets.toBeDeleted.subsets.group1);
    });

    it('should automatically add a multiple choice question with 4 options when adding a question', async function() {
        var question,
            questionTypeDropdown,
            questionType;

        await editQcPage.addQuestion();
        questionTypeDropdown = editQcPage.questions[0].getQuestionTypeDropdown();
        questionType = await common.getSelectedText(questionTypeDropdown);
        expect(questionType).toBe(data.questionTypes.mc);
    });

    it('should not show reordering icons if there is only a single question', async function() {
        var question = editQcPage.questions[0];
        expect(await question.getReorderUpBtn().isPresent()).toBe(false);
        expect(await question.getReorderDownBtn().isPresent()).toBe(false);
    });
});

describe('Adding feedback to a question', function() {
    var question;

    beforeEach(function() {
        question = editQcPage.getQuestion(0);
    });

    it('should show the custom feedback panel when the button is clicked', async function() {
        var feedbackPanel;
        await question.feedback.addCustomFeedback();
        feedbackPanel = question.feedback.getFeedbackPanel();
        expect(await feedbackPanel.isDisplayed()).toBe(true);
    });

    it('should show feedback for correct options', async function() {
        expect(await question.feedback.getCorrectFeedback().isDisplayed()).toBe(true);
    });

    it('should show feedback for incorrect options', async function() {
        expect(await question.feedback.getIncorrectFeedback().isDisplayed()).toBe(true);
    });

    it('should remove the custom feedback panel when the delete button is clicked', async function() {
        await question.feedback.deleteFeedback();
        expect(await question.feedback.getFeedbackPanel().isPresent()).toBe(false);
    });
});

describe('Deleting a question', function() {
    var question;

    beforeEach(function() {
        question = editQcPage.getQuestion(0);
    });

    //deleting a question also creates a confirm js alert, so run this test while we are in a new tab instead of in iframe
    it('should remove the question when the delete question button is clicked', async function() {
        await question.deleteQuestion();
        expect(await editQcPage.getQuestions().count()).toBe(0);
    });

    it('should label the question as question #1 after the first question was deleted', async function() {
        var newQuestion;

        await editQcPage.addQuestion(data.questionTypes.mc);
        newQuestion = editQcPage.getQuestions().get(0);
        expect(await newQuestion.getText()).toContain('question #1');
        //re-initialize page questions for next round of tests since one was deleted
        await editQcPage.initQuestions();
    });
});

describe('Using the rich content editor toggle', function() {
    var option,
        question,
        submittedText = 'Test content, will be deleted.',
        richText = '<p>' + submittedText + '</p>';

    describe('in a multiple choice question', function() {
        beforeEach(function() {
            question = editQcPage.getQuestion(0);
            option = question.getOptions().get(0);
        });

        it('should show a toggle', async function() {
            expect(await question.getRichContentToggle().isDisplayed()).toBe(true);
        });

        it('should show a rich content editor when toggle is enabled', async function() {
            //add a bit of content first so we can see if it remains
            await question.enterMcTextOption(option, submittedText);

            await question.toggleRichContent();
            const iframe = await common.getTinyMceIframeFromElement(option, true);
            expect(await iframe.isDisplayed()).toBe(true);
        });

        it('should remove the basic input element when toggle is enabled', async function() {
            expect(await question.getOptionInput(option).isPresent()).toBe(false);
        });

        it('should retain existing information when toggle is enabled', async function() {
            await common.enterTinyMceIframeInElement(option);
            expect(await common.getTinyMceText(option)).toBe(submittedText);
            await common.leaveTinyMceIframe();
            await common.enterAngularPage();
        });

        it('should remove the rich content editor when toggle is disabled', async function() {
            await question.toggleRichContent();
            const iframe = await common.getTinyMceIframeFromElement(option);
            expect(await iframe.isPresent()).toBe(false);
        });

        it('should show the basic input element when the toggle is disabled', async function() {
            expect(await question.getOptionInput(option).isDisplayed()).toBe(true);
        });

        it('should retain existing information when the toggle is disabled', async function() {
            expect(await question.getMcOptionInputValue(option)).toBe(richText);
            //initialize for next round of tests
            await editQcPage.addQuestion(data.questionTypes.mcorrect);
            await editQcPage.initQuestions();
        });
    });

    describe('in a multiple correct question', function() {
        beforeEach(function() {
            question = editQcPage.getQuestion(1);
            option = question.getOptions().get(0);
        });

        it('should show a toggle', async function() {
            expect(await question.getRichContentToggle().isDisplayed()).toBe(true);
        });

        it('should show a rich content editor when toggle is enabled', async function() {
            //add a bit of content first so we can see if it remains
            await question.enterMcTextOption(option, submittedText);

            await question.toggleRichContent();
            const iframe = await common.getTinyMceIframeFromElement(option, true);
            expect(await iframe.isDisplayed()).toBe(true);
        });

        it('should remove the basic input element when toggle is enabled', async function() {
            expect(await question.getOptionInput(option).isPresent()).toBe(false);
        });

        it('should retain existing information when toggle is enabled', async function() {
            await common.enterTinyMceIframeInElement(option);
            await expect(common.getTinyMceText(option)).toBe(submittedText);
            await common.leaveTinyMceIframe();
            await common.enterAngularPage();
        });

        it('should remove the rich content editor when toggle is disabled', async function() {
            await question.toggleRichContent();
            const iframe = await common.getTinyMceIframeFromElement(option);
            expect(await iframe.isPresent()).toBe(false);
        });

        it('should show the basic input element when the toggle is disabled', async function() {
            expect(await question.getOptionInput(option).isDisplayed()).toBe(true);
        });

        it('should retain existing information when the toggle is disabled', async function() {
            expect(await question.getMcOptionInputValue(option)).toBe(richText);
        });
    });

    describe('in the feedback panel', function() {
        var correctFeedbackContainer,
            responseFeedbackOption;

        beforeEach(function() {
            question = editQcPage.getQuestion(1);
        });

        describe('for basic feedback', function() {
            it('should show a toggle', async function() {
                await question.feedback.addCustomFeedback();
                expect(await question.feedback.getRichContentToggle().isDisplayed()).toBe(true);
            });

            it('should show a rich content editor when toggle is enabled', async function() {
                correctFeedbackContainer = question.feedback.getCorrectFeedbackContainer();
                //add a bit of content first so we can see if it remains
                await question.feedback.getCorrectFeedback().sendKeys(submittedText);
                await question.feedback.toggleRichContent();
                const iframe = await common.getTinyMceIframeFromElement(correctFeedbackContainer, true);
                expect(await iframe.isDisplayed()).toBe(true);
            });

            it('should retain existing information when toggle is enabled', async function() {
                await common.enterTinyMceIframeInElement(correctFeedbackContainer);
                expect(await common.getTinyMceText(correctFeedbackContainer)).toBe(submittedText);
                await common.leaveTinyMceIframe();
                await common.enterAngularPage();
            });

            it('should remove the rich content editor when toggle is disabled', async function() {
                await question.feedback.toggleRichContent();
                const iframe = await common.getTinyMceIframeFromElement(correctFeedbackContainer);
                expect(await iframe.isPresent()).toBe(false);
            });

            it('should show the basic input element when the toggle is disabled', async function() {
                expect(await question.feedback.getCorrectFeedback().isDisplayed()).toBe(true);
            });
        });

        describe('for per-option feedback', function() {
            it('should show a toggle', async function() {
                await question.feedback.togglePerResponseFeedback();
                expect(await question.feedback.getRichContentToggle().isDisplayed()).toBe(true);
            });

            it('should show a rich content editor when toggle is enabled', async function() {
                //add a bit of content first so we can see if it remains
                responseFeedbackOption = question.feedback.getPerResponseFeedbackOptions().get(0);
                await question.feedback.enterResponseFeedback(responseFeedbackOption, submittedText);
                await question.feedback.toggleRichContent();
                const iframe = await common.getTinyMceIframeFromElement(responseFeedbackOption, true);
                expect(await iframe.isDisplayed()).toBe(true);
            });

            it('should retain existing information when toggle is enabled', async function() {
                await common.enterTinyMceIframeInElement(responseFeedbackOption);
                expect(await common.getTinyMceText(responseFeedbackOption)).toBe(submittedText);
                await common.leaveTinyMceIframe();
                await common.enterAngularPage();
            });

            it('should remove the rich content editor when toggle is disabled', async function() {
                await question.feedback.toggleRichContent();
                const iframe = await common.getTinyMceIframeFromElement(responseFeedbackOption);
                expect(await iframe.isPresent()).toBe(false);
            });

            it('should show the basic input element when the toggle is disabled', async function() {
                expect(await question.feedback.getPerResponseFeedbackInput(responseFeedbackOption).isDisplayed()).toBe(true);
            });
        });
    });

    describe('in other question types', function() {
        it('should not appear for matching questions', async function() {
            await question.setQuestionType(data.questionTypes.matching);
            expect(await question.getRichContentToggle().isPresent()).toBe(false);
        });

        it('should not appear for matrix questions', async function() {
            await question.setQuestionType(data.questionTypes.matrix);
            expect(await question.getRichContentToggle().isPresent()).toBe(false);
        });

        it('should not appear for dropdown questions', async function() {
            await question.setQuestionType(data.questionTypes.dropdowns);
            expect(await question.getRichContentToggle().isPresent()).toBe(false);
        });

        it('should not appear for textmatch questions', async function() {
            await question.setQuestionType(data.questionTypes.textmatch);
            expect(await question.getRichContentToggle().isPresent()).toBe(false);
        });

        it('should not appear for numerical questions', async function() {
            await question.setQuestionType(data.questionTypes.numerical);
            expect(await question.getRichContentToggle().isPresent()).toBe(false);
        });
    });
});

describe('Reordering questions', function() {
    it('should not show a reorder up arrow if it is the first question', async function() {
        var question = editQcPage.getQuestion(0);
        expect(await question.getReorderUpBtn().isPresent()).toBe(false);
    });

    it('should not show a reorder down arrow if it is the last question', async function() {
        var question = editQcPage.getQuestion(1);
        expect(await question.getReorderDownBtn().isPresent()).toBe(false);
    });

    it('should move a question up if the reorder up arrow is clicked', async function() {
        var question = editQcPage.getQuestion(1),
            movedQuestion;

        await question.getReorderUpBtn().click();
        //re-init questions to make sure they're composed properly
        await editQcPage.initQuestions();
        movedQuestion = editQcPage.getQuestion(0);
        expect(await movedQuestion.getQuestionType()).toBe(data.questionTypes.numerical);
    });

    it('should show the appropriate question number when the up arrow is clicked', async function() {
        expect(await editQcPage.getQuestion(0).getHeaderText()).toBe('question #1');
    });

    it('should displace the previous question if the reorder up arrow is clicked', async function() {
        expect(await editQcPage.getQuestion(1).getQuestionType()).toBe(data.questionTypes.mc);
    });

    it('should show the appropriate question number for the displaced question below', async function() {
        expect(await editQcPage.getQuestion(1).getHeaderText()).toBe('question #2');
    });

    it('should move a question down if the reorder down arrow is clicked', async function() {
        var question = editQcPage.getQuestion(0),
            movedQuestion;

        await question.getReorderDownBtn().click();
        await editQcPage.initQuestions();
        movedQuestion = editQcPage.getQuestion(1);
        expect(await movedQuestion.getQuestionType()).toBe(data.questionTypes.numerical);
    });

    it('should show the appropriate question number when the down arrow is clicked', async function() {
        expect(await editQcPage.getQuestion(1).getHeaderText()).toBe('question #2');
    });

    it('should displace the previous question if the reorder down arrow is clicked', async function() {
        expect(await editQcPage.getQuestion(0).getQuestionType()).toBe(data.questionTypes.mc);
    });

    it('should show the appropriate question number for the displaced question above', async function() {
        expect(await editQcPage.getQuestion(0).getHeaderText()).toBe('question #1');
    });
});

describe('Navigating away from editing a quick check without saving', function() {
    it('should display a confirm message', async function () {
        await editQcPage.goBack();
        await common.acceptAlert();
    });
});