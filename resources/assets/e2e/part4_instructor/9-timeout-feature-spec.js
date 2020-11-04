var includes = require('../common/includes.js'),
    data = includes.data,
    canvasAssignmentsPage = new includes.CanvasAssignmentsPage(browser),
    common = new includes.Common(browser),
    qcPage = new includes.QcPage(browser),
    EC = protractor.ExpectedConditions;

describe('Taking an assessment with the timeout feature turned on', function() {
    it('should not show a timeout message initially', async function() {
        await common.closeTab(1);
        await common.switchTab(0);
        await common.enterNonAngularPage();
        await canvasAssignmentsPage.goToStudentView();
        await canvasAssignmentsPage.goToAssignments();
        await canvasAssignmentsPage.openAssignment(data.sets.featuresAllOn.quickchecks.featuresAllOn);
        await common.switchToLtiTool();
        await common.enterAngularPage();
        expect(await qcPage.getTimeoutModal().isPresent()).toBe(false);
    });

    it('should not include page views as part of the attempt count', async function() {
        await qcPage.selectMcOptionByIndex(0);
        await qcPage.submit();
        await qcPage.clickContinue();
        await browser.sleep(500); //wait for modal to disappear
        await qcPage.startOver();
        await qcPage.startOver();
        expect(await qcPage.getTimeoutModal().isPresent()).toBe(false);
    });

    it('should show a timeout message after two attempts with at least one response', async function() {
        await qcPage.selectMcOptionByIndex(0);
        await qcPage.submit();
        await qcPage.clickContinue();
        await browser.sleep(500); //wait for modal to disappear
        await qcPage.startOver();
        await common.enterNonAngularPage(); //interval timer messes with angular change detection, freezes waiting for it to end
        await browser.wait(EC.visibilityOf(qcPage.getTimeoutModal()), 5000);
        expect(await qcPage.getTimeoutModal().isDisplayed()).toBe(true);
    });

    it('should show a timer', async function() {
        expect(await qcPage.getTimeoutTimer().isDisplayed()).toBe(true);
    });

    it('should show the timeout message still if refreshed', async function() {
        await common.switchToCanvas();
        await browser.refresh();
        await common.switchToLtiTool();
        await common.enterNonAngularPage(); //interval timer messes with angular change detection, freezes waiting for it to end
        await browser.wait(EC.visibilityOf(qcPage.getTimeoutModal()), 5000);
        expect(await qcPage.getTimeoutModal().isDisplayed()).toBe(true);
    });

    it('should show a restart button after the timeout completes', async function() {
        //timeout length set as 15 seconds in env
        await browser.sleep(15000);
        expect(await qcPage.getTimeoutRestartBtn().isDisplayed()).toBe(true);
    });

    it('should not show a timeout when refreshed after timeout period ends', async function() {
        await qcPage.getTimeoutRestartBtn().click();
        await browser.sleep(1000);
        expect(await qcPage.getTimeoutModal().isPresent()).toBe(false);
    });

    it('should not be in effect with instructors, when a grade is not involved', async function() {
        var attemptCount;

        //leave student view; if a question is answered and restarted twice, should be in timeout zone
        await common.switchToCanvas();
        await common.leaveStudentView();
        await browser.sleep(1000);
        await common.switchToLtiTool();
        await common.enterAngularPage();
        for (attemptCount = 0; attemptCount < 2; attemptCount++) {
            await qcPage.selectMcOptionByIndex(0);
            await qcPage.submit();
            await qcPage.clickContinue();
            await browser.sleep(500); //wait for modal to disappear
            await qcPage.startOver();
        }
        expect(await qcPage.getTimeoutModal().isPresent()).toBe(false);
    });
});
