var includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser),
    attemptOverviewPage = new includes.AttemptOverviewPage(browser),
    attemptsPage = new includes.AttemptsPage(browser);

//take a look at quiz #3
describe('Toggling ungraded assessments', function() {
    //should show the student's attempt but hide the instructor's attempt, since instructor grade is NA
    it('should only show ungraded assignments and hide graded or NA assignments', async function() {
        var attemptsVisible,
            assessmentName = data.sets.featuresAllOff.quickchecks.featuresAllOffPastDue;

        await attemptOverviewPage.getAssessmentByName(assessmentName).click();

        attemptsVisible = await attemptsPage.attempts.getAttemptsVisible();
        expect(attemptsVisible.length).toBe(6);

        await attemptsPage.toggleUngraded();
        attemptsVisible = await attemptsPage.attempts.getAttemptsVisible();
        expect(await attemptsVisible.length).toBe(5);

        await attemptsPage.toggleUngraded();
        attemptsVisible = await attemptsPage.attempts.getAttemptsVisible();
        expect(await attemptsVisible.length).toBe(6);
    });
});

describe('Grading an assessment', function() {
    var attemptIndex = 1,
        displayedGrade,
        gradeInput = attemptsPage.attempts.getGradeInput(attemptIndex);

    it('should show an empty input for grade if the assignment is ungraded', async function() {
        expect(await gradeInput.isDisplayed()).toBe(true);
    });

    it('should throw an error if no grade is entered', async function() {
        await attemptsPage.attempts.submitGrade(attemptIndex);
        expect(await attemptsPage.attempts.getGradeError(attemptIndex).getText()).toContain('The grade must be a number');
    });

    it('should show the correct grade after it has been entered using a 0-100 grading scale', async function() {
        await gradeInput.sendKeys('100');
        await attemptsPage.attempts.submitGrade(attemptIndex);
        displayedGrade = await attemptsPage.attempts.getEditGradeLink(attemptIndex);
        expect(await displayedGrade.getText()).toContain('100');
    });

    it('should hide the grade input and remove previous error after a successful submission', async function() {
        expect(await gradeInput.isDisplayed()).toBe(false);
        expect(await attemptsPage.attempts.getGradeError(attemptIndex).isPresent()).toBe(false);
    });

    it('should show the grade input when the grade is edited', async function() {
        await displayedGrade.click();
        expect(await gradeInput.isDisplayed()).toBe(true);
    });

    it('should autofill the current grade in the text input when editing', async function() {
        expect(await gradeInput.getAttribute('value')).toBe('100');
    });

    it('should correctly change the grade when it has been edited using a 1-100 grading scale', async function() {
        await gradeInput.clear();
        await gradeInput.sendKeys('1');
        await attemptsPage.attempts.submitGrade(attemptIndex);
        expect(await displayedGrade.getText()).toContain('1');
        //make sure the 1 is not converted as a decimal to 100, which our system used to do
        expect(await displayedGrade.getText()).not.toContain('100');
    });

    it('should accept float values between 1-100', async function() {
        await displayedGrade.click();
        await gradeInput.clear();
        await gradeInput.sendKeys('33.97');
        await attemptsPage.attempts.submitGrade(attemptIndex);
        expect(await displayedGrade.getText()).toContain('33.97');
    });

    it('should accept a grade of 0', async function() {
        await displayedGrade.click();
        await gradeInput.clear();
        await gradeInput.sendKeys('0');
        await attemptsPage.attempts.submitGrade(attemptIndex);
        expect(await displayedGrade.getText()).toContain('0');
        await attemptsPage.goBack();
    });
});

//take a look at quiz #4
describe('Auto-grading an assessment', function() {
    it('should give a grade corresponding to a student\'s calculated score', async function() {
        var attemptIndex = 1,
            assessmentName = data.sets.featuresAllOff.quickchecks.resultsNotReleased;

        await attemptOverviewPage.getAssessmentByName(assessmentName).click();
        await attemptsPage.autoGrade();
        const gradeLink = await attemptsPage.attempts.getEditGradeLink(attemptIndex);
        expect(await gradeLink.getText()).toContain('0');
        await attemptsPage.nav.goToResults();
    });
});