var includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser),
    creds = includes.userCreds,
    attemptOverviewPage = new includes.AttemptOverviewPage(browser),
    studentResultsPage = new includes.StudentResultsPage(browser);

describe('Reviewing individual results from the attempts overview page', function() {
    it('should show a toggle for results by student', async function() {
        const toggle = await attemptOverviewPage.getStudentResultsToggle();
        expect(await toggle.isDisplayed()).toBe(true);
    });

    it('should default to showing results by quick check first', async function() {
        expect(await attemptOverviewPage.getAttempts().count()).toBe(6);
    });

    it('should list students when the toggle is on', async function() {
        await attemptOverviewPage.clickStudentToggle();
        expect(await attemptOverviewPage.getStudents().count()).toBe(3);
    });

    it('should show results by quick check again when toggle is turned off', async function() {
        await attemptOverviewPage.clickStudentToggle();
        expect(await attemptOverviewPage.getAttempts().count()).toBe(6);
    });

    it('should allow searching by last name', async function() {
        await attemptOverviewPage.clickStudentToggle();
        await attemptOverviewPage.search(creds.student.last);
        expect(await attemptOverviewPage.getStudents().count()).toBe(1);
    });

    it('should show all students', async function() {
        await attemptOverviewPage.clearSearch();
        expect(await attemptOverviewPage.getStudents().get(0).getText()).toContain(creds.instructor.last);
        expect(await attemptOverviewPage.getStudents().get(1).getText()).toContain(creds.student.last);
        expect(await attemptOverviewPage.getStudents().get(2).getText()).toContain(creds.admin.last);
    });
})

describe('Viewing results for an individual student', function() {
    it('should show all quick checks attempted by the student', async function() {
        await attemptOverviewPage.getStudents().get(1).click();
        expect(await studentResultsPage.getQuickChecks().count()).toBe(5);
    });

    it('should allow searching by quick check name', async function() {
        await studentResultsPage.search(data.sets.featuresAllOn.quickchecks.featuresAllOn);
        expect(await studentResultsPage.getQuickChecks().count()).toBe(1);
        await studentResultsPage.clearSearch();
    });

    it('should show attempt data when an accordion is opened', async function() {
        await studentResultsPage.toggleResults(0);
        expect(await studentResultsPage.getAttemptTable().isDisplayed()).toBe(true);
    });

    it('should show accurate attempt data', async function() {
        //test for count correct, count incorrect, and score on a completed, 100% attempt
        expect(await studentResultsPage.attempts.getCorrect(2)).toBe('7');
        expect(await studentResultsPage.attempts.getIncorrect(2)).toBe('0');
        expect(await studentResultsPage.attempts.getScore(2)).toBe('100%')
    });

    it('should show accurate grade data', async function() {
        const gradeLink = await studentResultsPage.attempts.getEditGradeLink(0);
        expect(await gradeLink.getText()).toContain('100');
    });

    it('should show student responses', async function() {
        //keep it cursory: just check that the number of responses listed is accurate
        await studentResultsPage.attempts.getResponsesBtn(2).click();
        expect(await studentResultsPage.responses.getQuestions().count()).toBe(7);
    });

    it('should show the due date if a due date is present', async function() {
        await studentResultsPage.responses.goBack();
        expect(await studentResultsPage.getDueDate(0).getText()).toContain('12/30');
    });

    it('should not show the due date if a due date is not present', async function() {
        await studentResultsPage.toggleResults(0);
        await studentResultsPage.toggleResults(1);
        expect(await studentResultsPage.getDueDate(1).isPresent()).toBe(false);
    });
});

describe('Viewing analytics for an individual student', function() {
    it('should show total attempts', async function() {
        await studentResultsPage.viewAnalytics();
        expect(await studentResultsPage.getTotalAttempts()).toBe('13');
    });

    it('should show average score', async function() {
        expect(await studentResultsPage.getAverageScore()).toBe('61.11%');
    });

    it('should show number of questions answered', async function() {
        expect(await studentResultsPage.getQuestionsAnswered()).toBe('22');
    });

    it('should show average number of retries', async function() {
        expect(await studentResultsPage.getAverageRetries()).toBe('1');
    });

    it('should show something intelligible for time analytics', async function() {
        //we can't really know how long these are going to take, but we know it's on the
        //order of seconds, so just look for seconds in each of the place
        expect(await studentResultsPage.getTotalTimeBeforeDueDate()).toContain('seconds');
        expect(await studentResultsPage.getTotalTimeAfterDueDate()).toContain('seconds');
        expect(await studentResultsPage.getTotalTimeOverall()).toContain('seconds');
        expect(await studentResultsPage.getAverageTimeBeforeDueDate()).toContain('seconds');
        expect(await studentResultsPage.getAverageTimeAfterDueDate()).toContain('seconds');
        expect(await studentResultsPage.getAverageTimeOverall()).toContain('seconds');
    });
});

describe('Viewing student results after student toggle was previously set', function() {
    it('should keep student results toggled if previously set', async function() {
        await studentResultsPage.nav.goToResults();
        expect(await attemptOverviewPage.isStudentToggleEnabled()).toBeTruthy();
    });

    it('should still show student data when student toggle is persisted', async function() {
        expect(await attemptOverviewPage.getStudents().count()).toBe(3);
        await studentResultsPage.nav.goToSets();
    });
});
