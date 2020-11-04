var includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser),
    attemptOverviewPage = new includes.AttemptOverviewPage(browser),
    attemptsPage = new includes.AttemptsPage(browser);

//take a look at quiz #2
describe('Viewing an assessment that was embedded as an external tool URL', function() {
    var attemptIndex = 1;

    it('should show a message that the quick check is ungraded', async function() {
        var assessmentName = data.sets.featuresAllOff.quickchecks.urlEmbed;
        await attemptOverviewPage.getAssessmentByName(assessmentName).click();
        expect(await attemptsPage.getGradingMessage()).toContain('UNGRADED');
    });

    it('should not show a due date if one is not present', async function() {
        expect(await attemptsPage.getDueDate().isPresent()).toBe(false);
    });

    it('should show a grade of NA for a student', async function() {
        expect(await attemptsPage.attempts.getGradeArea(attemptIndex).getText()).toBe('NA');
    });

    it('should still show a completed attempt correctly', async function() {
        expect(await attemptsPage.attempts.getCorrect(attemptIndex)).toBe('0');
        expect(await attemptsPage.attempts.getIncorrect(attemptIndex)).toBe('2');
        expect(await attemptsPage.attempts.getScore(attemptIndex)).toBe('50%');
        expect(await attemptsPage.attempts.isCompleted(attemptIndex)).toBe(true);
    });

    it('should show partial credit for matching and matrix questions correctly', async function() {
        var questions,
            partialCredit = 'Partial credit: 50%';

        await attemptsPage.attempts.getResponsesBtn(attemptIndex).click();
        questions = attemptsPage.responses.getQuestions();
        //doing this the lazy way, but could implement a function for it if needed elsewhere
        expect(await questions.get(0).getText()).toContain(partialCredit);
        expect(await questions.get(1).getText()).toContain(partialCredit);
        await attemptsPage.responses.goBack();
        await attemptsPage.goBack();
    });
});