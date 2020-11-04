var includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser),
    homePage = new includes.HomePage(browser),
    attemptOverviewPage = new includes.AttemptOverviewPage(browser),
    attemptsPage = new includes.AttemptsPage(browser);

describe('Releasing results', function() {
    //release results for an assessment in each of the 2 feature-toggled collections, then for the
    //third assessment, do not release results; this way, we can test if results are actually
    //hidden in student view when not released, and also be sure that student can see results right
    //off the bat for the 2 released ones, so we don't need to run back and forth between browsers

    it('should show all assessments in the results view, because attempts were made by an instructor viewing the quiz', async function() {
        var assessmentName = data.sets.featuresAllOn.quickchecks.featuresAllOn;
        await common.goToQuickCheck();
        await homePage.nav.goToResults();
        expect(await attemptOverviewPage.getAttempts().count()).toBe(5);
        await attemptOverviewPage.getAssessmentByName(assessmentName).click();
    });

    it('should initially have a button to release results, since they have not been released yet', async function() {
        expect(await attemptsPage.isReleaseBtnDisplayed()).toBe(true);
    });

    it('should show a success message when releasing results', async function() {
        await attemptsPage.toggleRelease();
        expect(await attemptsPage.getReleaseSuccess().isDisplayed()).toBe(true);
    });

    it('should change the release button to a rollback button after releasing', async function() {
        expect(await attemptsPage.isRollbackBtnDisplayed()).toBe(true);
    })

    it('should show a success message when rolling back results', async function() {
        await attemptsPage.toggleRelease();
        expect(await attemptsPage.getReleaseSuccess().isDisplayed()).toBe(true);
    });

    it('should change the rollback button to a release button after rolling back', async function() {
        expect(await attemptsPage.isReleaseBtnDisplayed()).toBe(true);
        //re-release these results, we want them visible to students
        await attemptsPage.toggleRelease();
    });

    it('should release the second quiz\'s attempt results', async function() {
        var assessmentName = data.sets.featuresAllOff.quickchecks.urlEmbed;
        await attemptsPage.goBack();
        await attemptOverviewPage.getAssessmentByName(assessmentName).click();
        await attemptsPage.toggleRelease();
        expect(await attemptsPage.isRollbackBtnDisplayed()).toBe(true);
        await attemptsPage.goBack();
    });

    it('should release the third quiz\'s attempt results', async function() {
        var assessmentName = data.sets.featuresAllOff.quickchecks.featuresAllOffPastDue;
        await attemptOverviewPage.getAssessmentByName(assessmentName).click();
        await attemptsPage.toggleRelease();
        expect(await attemptsPage.isRollbackBtnDisplayed()).toBe(true);
        //set up for when we next come back as instructor
        await attemptsPage.nav.goToSets();
    });
});