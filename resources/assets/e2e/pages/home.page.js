var HomePage = function(browserRef) {
    var page = this,
        EC = protractor.ExpectedConditions;
    page.browser = browserRef;
    page.includes = require('../common/includes.js');

    //subcomponents
    page.nav = new page.includes.NavComponent(page.browser);

    //elements
    page.addQcBtn = page.browser.element(by.css('.qc-hero-add-btn'));
    page.newQuickCheckInput = page.browser.element(by.css('#assessment-name'));
    page.newSetInput = page.browser.element(by.css('#collection-name'));
    page.newSubsetInput = page.browser.element(by.css('#assessment-group-name'));
    page.pageHeader = page.browser.element(by.css('h1'));
    page.saveBtn = page.browser.element(by.partialButtonText('Save'));
    page.setOptions = page.browser.element.all(by.css('.qc-home-membership'));
    page.setSelect = page.browser.element(by.css('#collection-select'));
    page.subsetOptions = page.browser.element.all(by.css('.qc-home-assessment-group'));
    page.subsetSelect = page.browser.element(by.css('#assessment-group-select'));

    //string selectors
    page.newSetText = '[Add new set]';
    page.newSubsetText = '[Add new subset]';

    //functions
    page.addQuickCheck = addQuickCheck;
    page.getHeader = getHeader;
    page.getNewSetInput = getNewSetInput;
    page.getNewSubsetInput = getNewSubsetInput;
    page.getSetOptions = getSetOptions;
    page.getSubsetOptions = getSubsetOptions;
    page.saveNewQuickCheck = saveNewQuickCheck;
    page.selectNewSet = selectNewSet;
    page.selectNewSubset = selectNewSubset;
    page.selectSet = selectSet;
    page.selectSubset = selectSubset;

    async function addQuickCheck() {
        await page.browser.wait(EC.elementToBeClickable(page.addQcBtn), 10000);
        await page.addQcBtn.click();
    }

    async function getHeader() {
        return await page.pageHeader.getText();
    }

    function getNewSetInput() {
        return page.newSetInput;
    }

    function getNewSubsetInput() {
        return page.newSubsetInput;
    }

    function getSetOptions() {
        return page.setOptions;
    }

    function getSubsetOptions() {
        return page.subsetOptions;
    }

    async function saveNewQuickCheck(quickCheckName) {
        await page.newQuickCheckInput.sendKeys(quickCheckName);
        await page.saveBtn.click();
    }

    async function selectNewSet() {
        await page.setSelect.sendKeys(page.newSetText);
    }

    async function selectNewSubset() {
        await page.subsetSelect.sendKeys(page.newSubsetText);
    }

    async function selectSet(setName) {
        await page.setSelect.sendKeys(setName);
    }

    async function selectSubset(subsetName) {
        await page.subsetSelect.sendKeys(subsetName);
    }
};

module.exports = HomePage;