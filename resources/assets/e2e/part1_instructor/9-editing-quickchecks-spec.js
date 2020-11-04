var includes = require('../common/includes.js'),
    allQuestionTypesData = new includes.AllQuestionTypesData(),
    common = new includes.Common(browser),
    data = includes.data,
    editQcPage = new includes.EditQcPage(browser),
    homePage = new includes.HomePage(browser),
    setPage = new includes.SetPage(browser),
    EC = protractor.ExpectedConditions;

describe('Adding a question', function() {
    it('should label the question as question #1', async function() {
        await editQcPage.addQuestion(data.questionTypes.mc);
        expect(await editQcPage.getQuestion(0).getHeaderText()).toBe('question #1');
    });
});

describe('Adding a multiple choice question', function() {
    var question,
        questionData;

    beforeEach(function() {
        question = editQcPage.getQuestion(0);
        questionData = data.quizData.quiz1.question1;
    });

    it('should accept question text', async function() {
        var questionText = data.quizData.quiz1.question1.questionText;
        await common.enterTinyMceText(questionText, question.question);

        await common.enterTinyMceIframeInElement(question.question);
        expect(await common.getTinyMceText()).toBe(questionText);

        await common.leaveTinyMceIframe();
        await common.enterAngularPage();
    });

    it('should default to randomizing answer option order', async function() {
        expect(await question.isRandomized()).toBeTruthy();
    });

    it('should allow unchecking the box for randomizing answer option order', async function() {
        await question.toggleRandomized();
        expect(await question.isRandomized()).toBeFalsy();
        await question.toggleRandomized(); //reset so this one is randomized
    });

    it('should throw a validation error if an option does not contain text', async function() {
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should throw a validation error if no correct answer is specified when trying to save', async function() {
        //add all option text to remove that validation error, but don't select a correct answer
        var options = question.getOptions();
        await question.enterMcTextOption(options.get(0), questionData.option1);
        await question.enterMcTextOption(options.get(1), questionData.option2);
        await question.enterMcTextOption(options.get(2), questionData.option3);
        await question.enterMcTextOption(options.get(3), questionData.option4);
        await editQcPage.saveWithError();
        expect(await editQcPage.getSaveError().getText()).toContain(data.validateNoCorrectMessage);
    });

    it('should allow an option to be marked as correct', async function() {
        var option = question.getOptions().get(0);
        await question.toggleMcOptionCorrect(option);
        expect(await question.isMcOptionMarkedCorrect(option)).toBe(true);
    });

    it('should default to only one answer being allowed as correct', async function() {
        var options = question.getOptions(),
            option1 = options.get(0),
            option2 = options.get(1);

        await question.toggleMcOptionCorrect(option2);
        expect(await question.isMcOptionMarkedCorrect(option2)).toBe(true);
        expect(await question.isMcOptionMarkedCorrect(option1)).toBe(false);
    });

    it('should allow adding a question option', async function() {
        await question.addMcOption();
        expect(await question.getOptions().count()).toBe(5);
    });

    it('should allow removing a question option', async function() {
        var lastOption = question.getOptions().get(4);
        await question.deleteOption(lastOption);
        expect(await question.getOptions().count()).toBe(4);
    });

    it('should show an option for per-response feedback', async function() {
        await question.feedback.addCustomFeedback();
        expect(await question.feedback.getPerResponseFeedbackCheckbox().isDisplayed()).toBe(true);
    });

    it('should hide question-level feedback when per-response feedback is selected', async function() {
        await question.feedback.togglePerResponseFeedback();
        expect(await question.feedback.getQuestionLevelFeedbackContainer().isPresent()).toBe(false);
    });

    it('should show question-level feedback again if per-response feedback is un-selected', async function() {
        await question.feedback.togglePerResponseFeedback();
        expect(await question.feedback.getQuestionLevelFeedbackContainer().isPresent()).toBe(true);
    });

    it('should show each of the options when per-response feedback is added', async function() {
        await question.feedback.togglePerResponseFeedback();
        expect(await question.feedback.getPerResponseFeedbackOptions().count()).toBe(4);
    });

    it('should show which option is correct in the per-response feedback options', async function() {
        var feedbackOptions = question.feedback.getPerResponseFeedbackOptions();
        expect(await question.feedback.isFeedbackOptionMarkedCorrect(feedbackOptions.get(0))).toBe(false);
        expect(await question.feedback.isFeedbackOptionMarkedCorrect(feedbackOptions.get(1))).toBe(true);
        expect(await question.feedback.isFeedbackOptionMarkedCorrect(feedbackOptions.get(2))).toBe(false);
        expect(await question.feedback.isFeedbackOptionMarkedCorrect(feedbackOptions.get(3))).toBe(false);
    });

    it('should throw a validation error if one of the per-response feedback inputs is left blank', async function() {
        var feedbackOptions = question.feedback.getPerResponseFeedbackOptions();
        await question.feedback.enterResponseFeedback(feedbackOptions.get(0), questionData.feedbackOption1);
        await question.feedback.enterResponseFeedback(feedbackOptions.get(1), questionData.feedbackOption2);
        await question.feedback.enterResponseFeedback(feedbackOptions.get(2), questionData.feedbackOption3);
        //leave last feedback input blank
        await editQcPage.saveWithError();
        expect(await editQcPage.getSaveError().isDisplayed()).toBe(true);
        //now fill in the last feedback input; also add the next question, so the next test can fetch it without problems
        await question.feedback.enterResponseFeedback(feedbackOptions.get(3), questionData.feedbackOption4);
        await editQcPage.addQuestion(data.questionTypes.mcorrect);
    });
    //NOTE: not testing for allowing multiple correct answers in multiple choice, because that feature will most
    //likely fall under the umbrella of creating survey questions in the future
});

describe('Adding a multiple correct question', function() {
    var question,
        questionData;

    beforeEach(function() {
        question = editQcPage.getQuestion(1);
        questionData = data.quizData.quiz1.question2;
    });

    it('should label the question as question #2', async function() {
        expect(await question.getHeaderText()).toBe('question #2');
    });

    it('should default to randomizing answer option order', async function() {
        expect(await question.isRandomized()).toBeTruthy();
        await question.toggleRandomized(); //unrandomize so we can easily grab proper inputs in student view
    });

    it('should allow adding a question option', async function() {
        await question.addMcOption();
        expect(await question.getOptions().count()).toBe(5);
    });

    it('should allow removing a question option', async function() {
        await question.deleteOption(question.getOptions().get(0));
        expect(await question.getOptions().count()).toBe(4);
    });

    it('should throw a validation error if an option does not contain text', async function() {
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should throw a validation error if no correct answer is specified when trying to save', async function() {
        //fill in the 4 options
        var options = question.getOptions();
        await question.enterMcTextOption(options.get(0), questionData.option1);
        await question.enterMcTextOption(options.get(1), questionData.option2);
        await question.enterMcTextOption(options.get(2), questionData.option3);
        await question.enterMcTextOption(options.get(3), questionData.option4);
        await editQcPage.saveWithError();
        expect(await editQcPage.getSaveError().getText()).toContain(data.validateNoCorrectMessage);
    });

    it('should allow marking multiple options as correct', async function() {
        var options = question.getOptions();
        //MM, 10/7/20: this spot kept failing where the first multiple correct option was NOT being marked
        //as correct, but second one was fine. I think since the error message shown has page focus (for
        //accessibility reasons), that clicking not on a non-native-html element (like a button or input)
        //but instead on an element with an aria role of button, like our correctness toggle, is just
        //removing the current focus with the click but not actually selecting what we want. tried to add
        //a click just to the body of the page every time we get the error message in a reusable spot in
        //the component class, but that didn't work. I wonder if it also has something to do with needing
        //to scroll because of the iframe? anyhow, I added a click to the input of the option we want to
        //mark as correct before actually doing so and that seemed to fix the issue.
        //TODO: see if this part and other troublesome parts work with the new tab thing
        //await question.getOptionInput(options.get(0)).click();
        await question.toggleMcOptionCorrect(options.get(0));
        await question.toggleMcOptionCorrect(options.get(1));
        expect(await question.isMcOptionMarkedCorrect(options.get(0))).toBe(true);
        expect(await question.isMcOptionMarkedCorrect(options.get(1))).toBe(true);
    });

    it('should allow toggling a correct answer to incorrect', async function() {
        var option = question.getOptions().get(1);
        await question.toggleMcOptionCorrect(option);
        expect(await question.isMcOptionMarkedCorrect(option)).toBe(false);
    });

    it('should allow toggling an incorrect answer to correct', async function() {
        var option = question.getOptions().get(1);
        await question.toggleMcOptionCorrect(option);
        expect(await question.isMcOptionMarkedCorrect(option)).toBe(true);
    });

    it('should show an option for per-response feedback', async function() {
        await question.feedback.addCustomFeedback();
        expect(await question.feedback.getPerResponseFeedbackCheckbox().isDisplayed()).toBe(true);
    });

    it('should show each of the options when per-response feedback is added', async function() {
        await question.feedback.togglePerResponseFeedback();
        expect(await question.feedback.getPerResponseFeedbackOptions().count()).toBe(4);
    });

    it('should show an indication of correctness when per-response feedback is added', async function() {
        var feedbackOptions = question.feedback.getPerResponseFeedbackOptions();
        expect(await question.feedback.isFeedbackOptionMarkedCorrect(feedbackOptions.get(0))).toBe(true);
        expect(await question.feedback.isFeedbackOptionMarkedCorrect(feedbackOptions.get(1))).toBe(true);
        expect(await question.feedback.isFeedbackOptionMarkedCorrect(feedbackOptions.get(2))).toBe(false);
        expect(await question.feedback.isFeedbackOptionMarkedCorrect(feedbackOptions.get(3))).toBe(false);
        //enter in feedback for these guys
        await question.feedback.enterResponseFeedback(feedbackOptions.get(0), questionData.feedbackOption1);
        await question.feedback.enterResponseFeedback(feedbackOptions.get(1), questionData.feedbackOption2);
        await question.feedback.enterResponseFeedback(feedbackOptions.get(2), questionData.feedbackOption3);
        await question.feedback.enterResponseFeedback(feedbackOptions.get(3), questionData.feedbackOption4);
        await editQcPage.addQuestion(data.questionTypes.matrix);
    });
});


describe('Adding a matrix question', function() {
    var question,
        questionData;

    beforeEach(function() {
        question = editQcPage.getQuestion(2);
        questionData = data.quizData.quiz1.question3;
    });

    it('should default to randomizing answer option order', async function() {
        expect(await question.isRandomized()).toBeTruthy();
        await question.toggleRandomized(); //unrandomize so we can easily grab proper inputs in student view
    });

    it('should allow adding columns', async function() {
        await question.addMatrixColumn();
        await question.addMatrixColumn();
        expect(await question.getMatrixColumns().count()).toBe(2);
    });

    it('should allow deleting columns', async function() {
        await question.deleteOption(question.getMatrixColumns().get(1));
        expect(await question.getMatrixColumns().count()).toBe(1);
    });

    it('should allow adding rows', async function() {
        await question.addMatrixRow();
        await question.addMatrixRow();
        expect(await question.getMatrixRows().count()).toBe(2);
    });

    it('should show the appropriate number of text inputs', async function() {
        expect(await question.getMatrixTextInputs().count()).toBe(3);
    });

    it('should show the appropriate number of checkboxes', async function() {
        expect(await question.getMatrixCheckboxes().count()).toBe(2);
    });

    it('should allow deleting rows', async function() {
        await question.deleteOption(question.getMatrixRows().get(1));
        expect(await question.getMatrixRows().count()).toBe(1);
    });

    it('should throw a validation error if the labels are not filled in for rows and columns', async function() {
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should throw a validation error if a correct answer isn\'t marked', async function() {
        //fill in all of the options now
        var textInputs;
        await question.addMatrixRow();
        await question.addMatrixColumn();
        textInputs = question.getMatrixTextInputs();
        await textInputs.get(0).sendKeys(questionData.column1);
        await textInputs.get(1).sendKeys(questionData.column2);
        await textInputs.get(2).sendKeys(questionData.row1);
        await textInputs.get(3).sendKeys(questionData.row2);

        await editQcPage.saveWithError();
        expect(await editQcPage.getSaveError().getText()).toContain(data.validateNoCorrectMessage);
    });

    it('should allow checking an answer', async function() {
        var checkboxes = question.getMatrixCheckboxes();
        await checkboxes.get(0).click();
        expect(await checkboxes.get(0).getAttribute('checked')).toBeTruthy();
    });

    it('should only allow one answer per row', async function() {
        var checkboxes = question.getMatrixCheckboxes();
        await checkboxes.get(1).click();
        expect(await checkboxes.get(0).getAttribute('checked')).toBeFalsy();
        expect(await checkboxes.get(1).getAttribute('checked')).toBeTruthy();

        //now add in the actual answers
        await checkboxes.get(0).click();
        await checkboxes.get(3).click();
    });

    it('should not show an option for per-response feedback', async function() {
        await question.feedback.addCustomFeedback();
        expect(await question.feedback.getPerResponseFeedbackCheckbox().isPresent()).toBe(false);
        //enter in feedback
        await question.feedback.getCorrectFeedback().sendKeys(questionData.feedbackCorrect);
        await question.feedback.getIncorrectFeedback().sendKeys(questionData.feedbackIncorrect);
        //prep for next text
        await editQcPage.addQuestion(data.questionTypes.matching);
    });
});


describe('Adding a matching question', function() {
    var question,
        questionData;

    beforeEach(function() {
        question = editQcPage.getQuestion(3);
        questionData = data.quizData.quiz1.question4;
    });

    it('should default to randomizing answer option order', async function() {
        expect(await question.isRandomized()).toBeTruthy();
        await question.toggleRandomized(); //unrandomize so we can easily grab proper inputs in student view
    });

    it('should allow adding matching pairs', async function() {
        await question.addMatchingPair();
        expect(await question.getMatchingPrompts().count()).toBe(1);
    });

    it('should throw a validation error if a matching pair field isn\'t filled', async function() {
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should allow deleting matching pairs', async function() {
        var optionToDelete;
        //Add in another row, then fill in all of the new text inputs to make it valid
        await question.addMatchingPair();
        const textInputs = question.getMatchingPairInputs();
        await textInputs.get(0).sendKeys(questionData.prompt1);
        await textInputs.get(1).sendKeys(questionData.answer1);
        await textInputs.get(2).sendKeys(questionData.prompt2);
        await textInputs.get(3).sendKeys(questionData.answer2);

        //add a third row, then delete it
        await question.addMatchingPair();
        optionToDelete = question.getMatchingPrompts().get(2);
        await question.deleteOption(optionToDelete);
        expect(await question.getMatchingPrompts().count()).toBe(2);
    });

    it('should allow adding distractors', async function() {
        await question.addDistractor();
        const distractors = question.getDistractors();
        expect(await distractors.count()).toBe(1);
    });

    it('should throw a validation error if a distractor field isn\'t filled', async function() {
        const distractors = question.getDistractors();
        await question.enterDistractor(distractors.get(0), questionData.distractor);
        await question.addDistractor();
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should allow deleting distractors', async function() {
        const distractors = question.getDistractors();
        //reset focus, this spot was failing randomly
        //await question.getDistractorInput(distractors.get(1)).click();
        await question.deleteOption(distractors.get(1));
        const updatedDistractors = question.getDistractors();
        await expect(await updatedDistractors.count()).toBe(1);
    });

    it('should not show an option for per-response feedback', async function() {
        //NOTE: adding custom feedback to this question so we can test that it gets deleted later when we edit
        await question.feedback.addCustomFeedback();
        await question.feedback.getCorrectFeedback().sendKeys('Does not matter');
        await question.feedback.getIncorrectFeedback().sendKeys('Also does not matter');
        expect(await question.feedback.getPerResponseFeedbackCheckbox().isPresent()).toBe(false);
        //set up for next test
        await editQcPage.addQuestion(data.questionTypes.dropdowns);
    });
});

describe('Adding a multiple dropdowns question', function() {
    var question,
        questionData;

    beforeEach(function() {
        question = editQcPage.getQuestion(4);
        questionData = data.quizData.quiz1.question5;
    });

    it('should not feature a randomize options checkbox', async function() {
        //should be no randomizing checkbox for multiple dropdowns, since order matters
        expect(await question.getRandomizedCheckbox().isPresent()).toBe(false);
    });

    it('should allow adding dropdown pairs', async function() {
        await question.addDropdownPair();
        const prompts = question.getDropdownPrompts();
        expect(await prompts.count()).toBe(1);
    });

    it('should throw a validation error if a dropdown pair field isn\'t filled', async function() {
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should allow deleting dropdown pairs', async function() {
        //add in the valid data
        await question.addDropdownPair();
        const textInputs = question.getDropdownTextInputs();
        await textInputs.get(0).sendKeys(questionData.prompt1);
        await textInputs.get(1).sendKeys(questionData.answer1);
        await textInputs.get(2).sendKeys(questionData.prompt2);
        await textInputs.get(3).sendKeys(questionData.answer2);

        await question.addDropdownPair();
        let prompts = question.getDropdownPrompts();
        await question.deleteOption(prompts.get(2));
        prompts = question.getDropdownPrompts();
        expect(await prompts.count()).toBe(2);
    });

    it('should allow adding distractors', async function() {
        await question.addDistractor();
        expect(await question.getDistractors().count()).toBe(1);
    });

    it('should throw a validation error if a distractor field isn\'t filled', async function() {
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should allow deleting distractors', async function() {
        const distractors = question.getDistractors();
        //fill in text for the first distractor
        await question.enterDistractor(question.getDistractors().get(0), questionData.distractor);
        await question.addDistractor();
        await question.deleteOption(question.getDistractors().get(1));
        expect(await question.getDistractors().count()).toBe(1);
    });

    it('should not show an option for per-response feedback', async function() {
        await question.feedback.addCustomFeedback();
        expect(await question.feedback.getPerResponseFeedbackCheckbox().isPresent()).toBe(false);
        await question.feedback.deleteFeedback();
        //set up for next test
        await editQcPage.addQuestion(data.questionTypes.textmatch);
    });
});

describe('Adding a textmatch question', function() {
    var question,
        questionData;

    beforeEach(function() {
        question = editQcPage.getQuestion(5);
        questionData = data.quizData.quiz1.question6;
    });

    it('should not feature a randomize options checkbox', async function() {
        //should be no randomizing checkbox for textmatch, since there is nothing to randomize
        expect(await question.getRandomizedCheckbox().isPresent()).toBe(false);
    });

    it('should allow adding a possible answer', async function() {
        await question.addTextmatchAnswer();
        expect(await question.getOptions().count()).toBe(1);
    });

    it('should throw a validation error if the textmatch answer field isn\'t filled', async function() {
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should allow deleting a possible answer', async function() {
        await question.addTextmatchAnswer();
        await question.deleteOption(question.getOptions().get(1));
        expect(await question.getOptions().count()).toBe(1);
    });

    it('should not show an option for per-response feedback', async function() {
        //while we're here, add in the actual answer
        await question.enterTextMatchOption(question.getOptions().get(0), questionData.option1);

        await question.feedback.addCustomFeedback();
        expect(await question.feedback.getPerResponseFeedbackCheckbox().isPresent()).toBe(false);
        await question.feedback.deleteFeedback();
        //set up for next test
        await editQcPage.addQuestion(data.questionTypes.numerical);
    });
});

describe('Adding a numerical question', function() {
    var question,
        questionData;

    beforeEach(function() {
        question = editQcPage.getQuestion(6);
        questionData = data.quizData.quiz1.question7;
    });

    it('should not feature a randomize options checkbox', async function() {
        await expect(question.getRandomizedCheckbox().isPresent()).toBe(false);
    });

    it('should allow adding a possible answer', async function() {
        await question.addNumericalAnswer();
        expect(await question.getOptions().count()).toBe(1);
    });

    it('should throw a validation error if the numeric answer field isn\'t filled', async function() {
        await editQcPage.saveWithoutSuccess();
        expect(await editQcPage.getSaveSuccess().isPresent()).toBe(false);
    });

    it('should show exact answer and margin of error as the default', async function() {
        var option;

        await question.addNumericalAnswer();
        option = question.getOptions().get(1);
        expect(await question.getExactAnswerInput(option).isDisplayed()).toBe(true);
        expect(await question.getMarginOfErrorInput(option).isDisplayed()).toBe(true);
        expect(await question.getRangeMinInput(option).isPresent()).toBe(false);
        expect(await question.getRangeMaxInput(option).isPresent()).toBe(false);
    });

    it('should show the range options when answer type is changed', async function() {
        var option = question.getOptions().get(1);
        await question.setOptionAsRange(option);
        expect(await question.getExactAnswerInput(option).isPresent()).toBe(false);
        expect(await question.getMarginOfErrorInput(option).isPresent()).toBe(false);
        expect(await question.getRangeMinInput(option).isDisplayed()).toBe(true);
        expect(await question.getRangeMaxInput(option).isDisplayed()).toBe(true);
    });

    it('should allow deleting a possible answer', async function() {
        await question.deleteOption(question.getOptions().get(1));
        expect(await question.getOptions().count()).toBe(1);
    });

    it('should not show an option for per-response feedback', async function() {
        await question.feedback.addCustomFeedback();
        expect(await question.feedback.getPerResponseFeedbackCheckbox().isPresent()).toBe(false);
        await question.feedback.deleteFeedback();
    });

    it('should accept an exact numerical answer', async function() {
        var option = question.getOptions().get(0);
        await question.enterNumericalExactOption(option, questionData.option1, '0');
    })
});

describe('Saving an assessment', function() {
    it('should show a success message if there are no errors', async function() {
        await editQcPage.save();
        expect(await editQcPage.getSaveSuccess().isDisplayed()).toBe(true);
    });

    it('should allow deleting previously saved custom feedback', async function() {
        await editQcPage.getQuestion(3).feedback.deleteFeedback();
        await editQcPage.save();
        expect(await editQcPage.getQuestion(3).feedback.getFeedbackPanel().isPresent()).toBe(false);
    });
});

// //OK, this isn't really a test. Just setting up for a later test, and nowhere else to put it.
describe('Adding another subset for testing purposes to later move the quick check', function() {
    var assessmentName,
        set,
        subset,
        subsetName,
        quickcheck;

    beforeEach(function() {
        set = data.sets.featuresAllOn;
        subsetName = set.subsets.group2;
        assessmentName = set.quickchecks.featuresAllOn;
    });

    it('should not raise a fuss', async function() {
        var subset,
            subsetInput,
            quickcheck;

        await editQcPage.goBackToSet();
        await setPage.addSubset();
        subsetInput = await setPage.getNewSubsetInput();
        await subsetInput.sendKeys(subsetName);
        await setPage.saveNewSubset();
        subset = setPage.getSubset(0);
        quickcheck = subset.getQuickChecks().get(0);
        await subset.editQuickCheck(quickcheck);
    });
});

describe('Editing a previously saved assessment should show the correct information', function() {
    it('should verify the data', async function() {
        await allQuestionTypesData.verify(editQcPage, data);
    })
});

describe('Changing the subset a quick check belongs to', function() {
    var formerSubsetName,
        newSubsetName;

    beforeEach(function() {
        formerSubsetName = data.sets.featuresAllOn.subsets.group1;
        newSubsetName = data.sets.featuresAllOn.subsets.group2;
    });

    it('should show all subsets available in the dropdown', async function() {
        expect(await editQcPage.getSubsetOptions().get(0).getText()).toBe(formerSubsetName);
        expect(await editQcPage.getSubsetOptions().get(1).getText()).toBe(newSubsetName);
        await editQcPage.getSubsetSelect().sendKeys(newSubsetName);
    });

    it('should keep the integrity of the data after saving', async function() {
        await editQcPage.save();
        expect(await editQcPage.getCurrentSubset()).toBe(newSubsetName);
     });

    it('should show this quickcheck in the subset it was moved to on the set page', async function() {
        var subset,
            quickchecks;

        await editQcPage.goBackToSet();
        subset = setPage.getSubset(1);
        quickchecks = subset.getQuickChecks();
        expect(await quickchecks.count()).toBe(1);
    });
});


//not explicitly testing these, since we tested the first one, but we do need to add a few other assessments for full coverage
describe('Adding the rest of the quick checks for testing purposes', function() {
    //First...2 sets, one has features all on, other has features all off; 4 quick checks total, for better coverage:
    //embed the 4 quick checks:
    //1) from set where features are all on (all question types),
    //2) to be embedded as external url (include 1 matrix and 1 matching question so we can test partial credit),
    //3) from set where features are all off (and with due date set in past, 1 multiple choice question),
    //4) where results aren't released (and no due date, 1 multiple choice question)
    var qc2Name,
        qc3Name,
        qc4Name,
        set,
        setName,
        subsetName;


    beforeEach(function() {
        set = data.sets.featuresAllOff;
        setName = set.name,
        subsetName = set.subsets.group1,
        qc2Name = set.quickchecks.urlEmbed,
        qc3Name = set.quickchecks.featuresAllOffPastDue,
        qc4Name = set.quickchecks.resultsNotReleased;
    });

    it('should add a new set/subset and quick check #2 without any fuss', async function() {
        var currentQuestion,
            i = 0,
            quizData = data.quizData.quiz2;

        //for this set, where all features are on, toggle the one that is off
        await setPage.openFeaturesAccordion();
        await setPage.featurePanel.toggleFeatureByIndex(1);

        //setPage = new includes.SetPage(browser);
        await setPage.nav.goToHome();
        //await browser.waitForAngular(true);

        //add new set and subset from home page
        await homePage.addQuickCheck();
        await homePage.selectNewSet();
        await homePage.getNewSetInput().sendKeys(setName);
        await homePage.getNewSubsetInput().sendKeys(subsetName);
        await homePage.saveNewQuickCheck(qc2Name);

        //set title and description so we can test later that it appears
        await editQcPage.initQuestions();
        //editQcPage = new includes.EditQcPage(browser);
        await editQcPage.getTitleInput().sendKeys(qc2Name);
        await editQcPage.getDescriptionInput().sendKeys('Description');

        //add matrix question
        await editQcPage.addQuestion(data.questionTypes.matrix);
        currentQuestion = editQcPage.getQuestion(0);
        await currentQuestion.toggleRandomized(); //note: toggling all of these as un-randomized so it's easier to test
        for(i = 0; i < 2; i++) {
            await currentQuestion.addMatrixRow();
            await currentQuestion.addMatrixColumn();
        }
        await currentQuestion.getMatrixTextInputs().get(0).sendKeys(quizData.question1.column1);
        await currentQuestion.getMatrixTextInputs().get(1).sendKeys(quizData.question1.column2);
        await currentQuestion.getMatrixTextInputs().get(2).sendKeys(quizData.question1.row1);
        await currentQuestion.getMatrixTextInputs().get(3).sendKeys(quizData.question1.row2);
        await currentQuestion.getMatrixCheckboxes().get(1).click();
        await currentQuestion.getMatrixCheckboxes().get(2).click();

        //add matching question, then save
        await editQcPage.addQuestion(data.questionTypes.matching);
        currentQuestion = editQcPage.getQuestion(1);
        await currentQuestion.toggleRandomized();
        for(i = 0; i < 2; i++) {
            await currentQuestion.addMatchingPair();
        }
        const matchingPairInputs = await currentQuestion.getMatchingPairInputs();
        await matchingPairInputs[0].sendKeys(quizData.question2.prompt1);
        await matchingPairInputs[1].sendKeys(quizData.question2.answer1);
        await matchingPairInputs[2].sendKeys(quizData.question2.prompt2);
        await matchingPairInputs[3].sendKeys(quizData.question2.answer2);

        await editQcPage.save();
        await editQcPage.nav.goToHome();
    });

    it('should successfully add quick check #3 to an existing set/subset from the home page', async function() {
        var correctOption,
            currentQuestion,
            option1,
            option2,
            option3,
            questionData = data.quizData.quiz3.question1,
            subset;

        //go back to home page to add the quick check
        await homePage.addQuickCheck();
        await homePage.selectSet(setName);
        await homePage.selectSubset(subsetName);
        await homePage.saveNewQuickCheck(qc3Name);

        await editQcPage.initQuestions();
        await editQcPage.addQuestion(data.questionTypes.numerical);
        currentQuestion = editQcPage.getQuestion(0);

        //3 options:
        //1. exact answer with 0 as margin of error; note that the answer itself is 0 in this case,
        //so we can also ensure that 0 is accepted as an answer (previous bug fix)
        await currentQuestion.addNumericalAnswer();
        //NOTE: at this point, there were no numerical options present, hrm; also an issue intermittently with text match in previous test so maybe related
        option1 = currentQuestion.getOptions().get(0);
        await currentQuestion.enterNumericalExactOption(option1, questionData.option1.exact, questionData.option1.margin);

        //2. exact answer with margin of error
        await currentQuestion.addNumericalAnswer();
        option2 = currentQuestion.getOptions().get(1);
        await currentQuestion.enterNumericalExactOption(option2, questionData.option2.exact, questionData.option2.margin);

        //3. range answer
        await currentQuestion.addNumericalAnswer();

        //MM, 11/5/19: repeated error in this part where protractor seemed to think last option was not there,
        //make sure to click it again if not clicked the first time
        const count = await currentQuestion.getOptions().count();
        if (count !== 3) {
            await currentQuestion.addNumericalAnswer();
        }

        option3 = currentQuestion.getOptions().get(2);
        await currentQuestion.setOptionAsRange(option3);
        await currentQuestion.enterNumericalRangeOption(option3, questionData.option3.rangeMin, questionData.option3.rangeMax);

        //save, go back to set page, and double check that the subset and quick check were properly added
        //MM, 11/5/19: erroring out here randomly, seems like save button is not being clicked, try a second time if not
        await editQcPage.save();
        const isSaved = await editQcPage.getSaveSuccess().isDisplayed();
        if (!isSaved) {
            await editQcPage.save();
        }
        await editQcPage.goBackToSet();
        await setPage.initSubsets();
        subset = setPage.getSubset(0);
        expect(await subset.getName()).toBe(subsetName.toUpperCase());
        expect(await subset.getQuickChecks().count()).toBe(2);
    });

    it('should successfully add quick check #4', async function() {
        var correctOption,
            currentQuestion,
            option1,
            option2,
            option3,
            option4,
            questionData = data.quizData.quiz4.question1,
            set,
            subset = setPage.getSubset(0);

        //while we're here, turn all features off for this set
        await setPage.openFeaturesAccordion();
        await setPage.featurePanel.toggleFeatureByIndex(0);
        await setPage.featurePanel.toggleFeatureByIndex(2);
        await setPage.featurePanel.toggleFeatureByIndex(3);

        //add the last quick check and edit it
        //TESTING: reset focus?
        await browser.element(by.css('body')).click();
        await subset.addAndSaveQuickCheck(qc4Name);
        await subset.editQuickCheck(subset.getQuickChecks().last());

        //add a single multiple choice question and save
        await editQcPage.initQuestions();
        await editQcPage.addQuestion(data.questionTypes.mc);
        currentQuestion = editQcPage.getQuestion(0);
        await currentQuestion.toggleRandomized();
        option1 = currentQuestion.getOptions().get(0);
        option2 = currentQuestion.getOptions().get(1);
        option3 = currentQuestion.getOptions().get(2);
        option4 = currentQuestion.getOptions().get(3);
        correctOption = currentQuestion.getOptions().get(questionData.answerIndex);

        await currentQuestion.enterMcTextOption(option1, questionData.option1);
        await currentQuestion.enterMcTextOption(option2, questionData.option2);
        await currentQuestion.enterMcTextOption(option3, questionData.option3);
        await currentQuestion.enterMcTextOption(option4, questionData.option4);
        await currentQuestion.toggleMcOptionCorrect(correctOption);
        await editQcPage.save();

        await editQcPage.goBackToSet();
    });
});