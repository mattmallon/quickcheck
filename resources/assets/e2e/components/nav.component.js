var NavComponent = function(browserRef) {
    var component = this;
    component.browser = browserRef;

    component.homeLink = component.browser.element(by.css('.qc-nav-home a'));
    component.resultsLink = component.browser.element(by.css('.qc-nav-results a'));
    component.setsLink = component.browser.element(by.css('.qc-nav-sets a'));

    //functions
    component.goToHome = goToHome;
    component.goToResults = goToResults;
    component.goToSets = goToSets;

    async function goToHome() {
        await component.homeLink.click();
        //ARGH sometimes Protractor refuses to click on this button even when told to,
        //so reclick if home page is not visible yet
        const homepage = await component.browser.element(by.css('.qc-home-page'));
        if (!await homepage.isPresent()) {
            await component.homeLink.click();
        }
    }

    async function goToResults() {
        await component.resultsLink.click();
        //see note above, sometimes second click is necessary
        const resultspage = await component.browser.element(by.css('.qc-results-page'));
        if (!await resultspage.isPresent()) {
            await component.resultsLink.click();
        }
    }

    async function goToSets() {
        await component.setsLink.click();
        //see note above, sometimes second click is necessary
        const setspage = await component.browser.element(by.css('.qc-sets-page'));
        if (!await setspage.isPresent()) {
            await component.setsLink.click();
        }
    }
};

module.exports = NavComponent;