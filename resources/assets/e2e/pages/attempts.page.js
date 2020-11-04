var AttemptsPage = function(browserRef) {
    var page = this;
    page.browser = browserRef;
    page.includes = require('../common/includes.js');
    page.common = new page.includes.Common(page.browser);

    //subcomponents
    page.analytics = new page.includes.AnalyticsComponent(page.browser);
    page.attempts = new page.includes.AttemptsTableComponent(page.browser);
    page.customResponses = new page.includes.CustomResponsesComponent(page.browser);
    page.nav = new page.includes.NavComponent(page.browser);
    page.responses = new page.includes.ResponsesComponent(page.browser);

    //elements
    page.analyticsBtn = page.browser.element(by.partialButtonText('View Analytics'));
    page.autoGradeBtn = page.browser.element(by.css('.qc-autograde-btn'));
    page.dueDate = page.browser.element(by.css('.qc-due-at'));
    page.goBackLink = page.browser.element(by.partialLinkText('Back'));
    page.gradingMessage = page.browser.element(by.css('.qc-graded-message'));
    page.releaseBtn = page.browser.element(by.css('.qc-release-btn'));
    page.releaseSuccess = page.browser.element(by.css('.release-alert'));
    page.searchBox = page.browser.element(by.css('.qc-search-box'));
    page.toggleUngradedCheckbox = page.browser.element(by.css('.ungraded-checkbox'));

    //sub-string selectors
    page.releaseText = 'RELEASE RESULTS';
    page.rollbackText = 'ROLLBACK RELEASED RESULTS';

    //functions
    page.autoGrade = autoGrade;
    page.clearSearch = clearSearch;
    page.getDueDate = getDueDate;
    page.getGradingMessage = getGradingMessage;
    page.getReleaseSuccess = getReleaseSuccess;
    page.goBack = goBack;
    page.isReleaseBtnDisplayed = isReleaseBtnDisplayed;
    page.isRollbackBtnDisplayed = isRollbackBtnDisplayed;
    page.search = search;
    page.toggleRelease = toggleRelease;
    page.toggleUngraded = toggleUngraded;
    page.viewAnalytics = viewAnalytics;

    async function autoGrade() {
        await page.autoGradeBtn.click();
    }

    async function clearSearch() {
        await page.searchBox.clear();
        //9/26/19: apparently clear() was not enough to trigger the angular model! so frustrating!
        //seems to waiting for some sort of keyup stroke or something that isn't triggered by selenium
        await page.searchBox.sendKeys('a');
        await page.searchBox.sendKeys(protractor.Key.BACK_SPACE);
    }

    function getDueDate() {
        return page.dueDate;
    }

    async function getGradingMessage() {
        return await page.gradingMessage.getText();
    }

    function getReleaseSuccess() {
        return page.releaseSuccess;
    }

    async function goBack() {
        //9/27/19: sometimes tests fail because link supposedly clicked but nothing happened, trying scrolling to fix
        await page.common.scrollToElement(page.goBackLink);
        await page.goBackLink.click();
    }

    async function isReleaseBtnDisplayed() {
        const text = await page.releaseBtn.getText();
        if (text.indexOf(page.releaseText) > -1) {
            return true;
        }

        return false;
    }

    async function isRollbackBtnDisplayed() {
        const text = await page.releaseBtn.getText();
        if (text.indexOf(page.rollbackText) > -1) {
            return true;
        }

        return false;
    }

    async function search(text) {
        await page.searchBox.sendKeys(text);
    }

    async function toggleRelease() {
        await page.releaseBtn.click();
    }

    async function toggleUngraded() {
        await page.toggleUngradedCheckbox.click();
    }

    async function viewAnalytics() {
        await page.analyticsBtn.click();
    }
}

module.exports = AttemptsPage;