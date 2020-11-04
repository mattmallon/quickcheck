var includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser),
    creds = includes.userCreds,
    attemptOverviewPage = new includes.AttemptOverviewPage(browser),
    attemptsPage = new includes.AttemptsPage(browser),
    viewSetsPage = new includes.ViewSetsPage(browser),
    setPage = new includes.SetPage(browser);

describe('Searching for sets', function() {
    var searchBox = viewSetsPage.getSearchBox();

    it('should show all sets initially', async function() {
        expect(await viewSetsPage.getMembershipTiles().count()).toBe(2);
    });

    it('should filter sets regardless of case', async function() {
        await searchBox.sendKeys(data.sets.featuresAllOn.name.toUpperCase());
        expect(await viewSetsPage.getMembershipTiles().count()).toBe(1);
    });

    it('should not show any sets if the text does not match', async function() {
        await searchBox.sendKeys('extra text');
        expect(await viewSetsPage.getMembershipTiles().count()).toBe(0);
    });

    it('should show all sets again after the search text has been erased', async function() {
        await viewSetsPage.clearSearch();
        expect(await viewSetsPage.getMembershipTiles().count()).toBe(2);
    });
});

describe('Searching inside a set', function() {
    var searchBox;

    it('should show quick check names that match the search', async function() {
        var membershipTile = viewSetsPage.getMembershipTiles().first(),
            assessmentName = data.sets.featuresAllOn.quickchecks.featuresAllOn,
            assessmentResults;

        await viewSetsPage.getGoToSetBtn(membershipTile).click();
        searchBox = setPage.getSearchBox();
        await searchBox.sendKeys(assessmentName);
        assessmentResults = setPage.getSearchAssessmentResults();
        expect(await assessmentResults.count()).toBe(1);
        expect(await assessmentResults.first().getText()).toContain(assessmentName);
        expect(await setPage.getSearchQuestionResults().count()).toBe(0);
    });

    it('should show questions that match the search', async function() {
        var assessmentName = data.sets.featuresAllOn.quickchecks.featuresAllOn,
            questionText = data.quizData.quiz1.question1.questionText,
            assessmentResults,
            questionResults;

        await searchBox.clear();
        await searchBox.sendKeys(questionText);
        //funnily enough, didn't realize that "answer is B" is also contained
        //in one of the QTI import questions!
        assessmentResults = setPage.getSearchAssessmentResults();
        questionResults = setPage.getSearchQuestionResults();
        expect(await assessmentResults.count()).toBe(2);
        expect(await assessmentResults.get(0).getText()).toContain(assessmentName);
        expect(await questionResults.count()).toBe(2);
        expect(await questionResults.get(0).getText()).toContain('Question #1')
    });

    it('should show answer options that match the search', async function() {
        var optionText = 'parmesan', //only included in an answer option for QTI import #1
            assessmentName = data.sets.featuresAllOn.quickchecks.qtiImportUngraded,
            assessmentResults,
            questionResults;

        await searchBox.clear();
        await searchBox.sendKeys(optionText);
        assessmentResults = setPage.getSearchAssessmentResults();
        questionResults = setPage.getSearchQuestionResults();
        expect(await assessmentResults.count()).toBe(1);
        expect(await assessmentResults.get(0).getText()).toContain(assessmentName);
        expect(await questionResults.count()).toBe(1);
        expect(await questionResults.get(0).getText()).toContain('Question #4');
    });

    it('should show feedback that matches the search', async function() {
        var feedbackText = data.quizData.quiz1.question3.feedbackIncorrect,
            assessmentName = data.sets.featuresAllOn.quickchecks.featuresAllOn,
            assessmentResults,
            questionResults;

        await searchBox.clear();
        await searchBox.sendKeys(feedbackText);
        assessmentResults = setPage.getSearchAssessmentResults();
        questionResults = setPage.getSearchQuestionResults();
        expect(await assessmentResults.count()).toBe(1);
        expect(await assessmentResults.get(0).getText()).toContain(assessmentName);
        expect(await questionResults.count()).toBe(1);
        expect(await questionResults.get(0).getText()).toContain('Question #3');
    });

    it('should show no results if there is no match', async function() {
        await searchBox.clear();
        await searchBox.sendKeys('european swallow');
        expect(await setPage.getSearchAssessmentResults().count()).toBe(0);
        expect(await setPage.getSearchQuestionResults().count()).toBe(0);
    });
});

describe('Searching for attempts by quick check name', function() {
    it('should show all quizzes initially', async function() {
        await setPage.nav.goToResults();
        expect(await attemptOverviewPage.getAttempts().count()).toBe(6);
    });

    it('should filter quizzes regardless of case', async function() {
        await attemptOverviewPage.search(data.sets.featuresAllOn.quickchecks.featuresAllOn.toUpperCase());
        expect(await attemptOverviewPage.getAttempts().count()).toBe(1);
    });

    it('should not show any quizzes if the text does not match', async function() {
        await attemptOverviewPage.clearSearch();
        await attemptOverviewPage.search('Knights who say ne');
        expect(await attemptOverviewPage.getAttempts().count()).toBe(0);
    });

    it('should show all quizzes again after the search text has been erased', async function() {
        await attemptOverviewPage.clearSearch();
        expect(await attemptOverviewPage.getAttempts().count()).toBe(6);
    });
});

describe('Searching attempts by name', function() {
    it('should filter attempts by last name when searched', async function() {
        var assessmentName = data.sets.featuresAllOn.quickchecks.featuresAllOn;
        await attemptOverviewPage.getAssessmentByName(assessmentName).click();
        await attemptsPage.search(creds.student.last);
        const attempts = await attemptsPage.attempts.getAttemptsVisible();
        expect(attempts.length).toBe(2);
    });

    it('should not show any attempts if the last name text does not match', async function() {
        await attemptsPage.clearSearch();
        await attemptsPage.search('Gandalf');
        const attempts = await attemptsPage.attempts.getAttemptsVisible();
        expect(attempts.length).toBe(0);
    });

    it('should show all attempts again after the search text has been erased', async function() {
        await attemptsPage.clearSearch();
        const attempts = await attemptsPage.attempts.getAttemptsVisible();
        expect(attempts.length).toBe(2);
    });
});
