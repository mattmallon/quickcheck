var CanvasLogin = function(browserRef) {
    var page = this,
        EC = protractor.ExpectedConditions;
    page.browser = browserRef;
    page.rootUrl = 'https://iu.instructure.com/courses/1588031';

    page.includes = require('../../common/includes.js');
    page.data = page.includes.data;

    //selectors (elements would not work because of NoSuchElementError across multiple pages;
    //I could make separate page objects for each, but considering we nede to do like ONE THING
    //on each of these pages, it just makes more sense to keep it in one, even if a touch clunkier)
    page.canvasNav = '#section-tabs';
    page.casEmailBtn = '#email';
    page.casGuestTab = '#tab-guest';
    page.casPasswordField = '#password';
    page.casSubmitBtn = '#login-button';
    page.casUserNameField = '#username';
    page.iFrame = '#tool_content';
    page.loginBtn = 'Log-in';

    //functions
    page.getNavItems = getNavItems;
    page.login = login;

    async function getNavItems() {
        await page.browser.driver.wait(EC.presenceOf(page.browser.element(by.css(page.canvasNav))));
        return await page.browser.driver.findElement(by.css(page.canvasNav)).getText();
    }

    async function login(username, password) {
        await page.browser.driver.get(page.rootUrl);
        await page.browser.driver.findElement(by.css(page.casGuestTab)).click();
        await page.browser.driver.findElement(by.css(page.casEmailBtn)).click();
        await page.browser.driver.findElement(by.css(page.casUserNameField)).sendKeys(username);
        await page.browser.driver.findElement(by.css(page.casPasswordField)).sendKeys(password);
        await page.browser.driver.findElement(by.css(page.casSubmitBtn)).click();
    }
};

module.exports = CanvasLogin;