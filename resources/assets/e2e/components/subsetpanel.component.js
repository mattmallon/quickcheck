var SubsetPanelComponent = function(browserRef, subsetElement) {
    var component = this,
        EC = protractor.ExpectedConditions;
    component.browser = browserRef;
    //default to first subset; can be set manually as well
    if (subsetElement) {
        component.subset = subsetElement;
    }
    else {
        component.subset = component.browser.element.all(by.css('.qc-subset-panel')).first();
    }

    //elements
    component.addQcBtn = component.subset.element(by.partialButtonText('Add new quick check to subset'));
    component.deleteSubsetBtn = component.subset.element(by.css('.qc-subset-delete-btn'));
    component.editSubsetBtn = component.subset.element(by.css('.qc-subset-edit-btn'));
    component.editSubsetInput = component.subset.element(by.css('input'));
    component.header = component.subset.element(by.css('.qc-assessment-group-title'));
    component.name = component.subset.element(by.css('h3'));
    component.newQcInput = component.subset.element(by.css('input'));
    component.quickChecks = component.subset.all(by.css('.qc-quiz-row'));
    component.saveQcBtn = component.subset.element(by.partialButtonText('Save'));
    component.subsetInstructions = component.subset.element(by.tagName('p'));

    //selectors (for sub-components)
    component.copyQcBtn = '.qc-quiz-copy-btn';
    component.copyQcEditBtn = '.qc-quiz-copy-edit-btn';
    component.copyQcName = '.qc-copy-quiz-name';
    component.copyQcPanel = '.qc-quiz-copy-panel';
    component.copyQcSetSelect = '.qc-copy-quiz-collection';
    component.copyQcSubmitBtn = '.qc-copy-quiz-submit';
    component.copyQcSubsetSelect = '.qc-copy-quiz-assessment-group';
    component.deleteQcBtn = '.qc-quiz-delete-btn';
    component.editQcBtn = '.qc-quiz-edit-btn';
    component.previewQcBtn = '.qc-quiz-preview-btn';

    //functions
    component.addQuickCheck = addQuickCheck;
    component.addAndSaveQuickCheck = addAndSaveQuickCheck;
    component.areSubsetInstructionsVisible = areSubsetInstructionsVisible;
    component.copyQuickCheck = copyQuickCheck;
    component.deleteQuickCheck = deleteQuickCheck;
    component.deleteSubset = deleteSubset;
    component.editQuickCheck = editQuickCheck;
    component.editSubset = editSubset;
    component.getAddQcBtn = getAddQcBtn;
    component.getCopyEditBtn = getCopyEditBtn;
    component.getCopyPanel = getCopyPanel;
    component.getCopyQuickCheckName = getCopyQuickCheckName;
    component.getCopySelectSetDropdownOptions = getCopySelectSetDropdownOptions;
    component.getCopySelectSetDropdownValue = getCopySelectSetDropdownValue;
    component.getCopySelectSubsetDropdownOptions = getCopySelectSubsetDropdownOptions;
    component.getCopySelectSubsetDropdownValue = getCopySelectSubsetDropdownValue;
    component.getDeleteQcBtn = getDeleteQcBtn;
    component.getDeleteSubsetBtn = getDeleteSubsetBtn;
    component.getEditSubsetBtn = getEditSubsetBtn
    component.getEditSubsetInput = getEditSubsetInput;
    component.getName = getName;
    component.getNewQcInput = getNewQcInput;
    component.getQuickChecks = getQuickChecks;
    component.previewQuickCheck = previewQuickCheck;
    component.saveQuickCheck = saveQuickCheck;
    component.setSubset = setSubset;
    component.submitCopy = submitCopy;
    component.submitEditedSubset = submitEditedSubset;
    component.toggleAccordion = toggleAccordion;

    async function addQuickCheck() {
        await component.addQcBtn.click();
    }

    async function addAndSaveQuickCheck(quickcheckName) {
        await component.addQcBtn.click();
        await component.browser.wait(EC.presenceOf(component.getNewQcInput()), 10000);
        await component.getNewQcInput().sendKeys(quickcheckName);
        await component.saveQuickCheck();
    }

    async function areSubsetInstructionsVisible() {
        return await component.subsetInstructions.isDisplayed();
    }

    async function copyQuickCheck(quickcheck) {
        await quickcheck.element(by.css(component.copyQcBtn)).click();
    }

    async function deleteQuickCheck(quickCheck) {
        await quickCheck.element(by.css(component.deleteQcBtn)).click();
    }

    async function deleteSubset() {
        await component.deleteSubsetBtn.click();
    }

    async function editQuickCheck(quickCheck) {
        await quickCheck.element(by.css(component.editQcBtn)).click();
    }

    async function editSubset() {
        await component.editSubsetBtn.click();
    }

    function getAddQcBtn() {
        return component.addQcBtn;
    }

    function getCopyEditBtn(quickcheck) {
        return quickcheck.element(by.css(component.copyQcEditBtn));
    }

    function getCopyPanel(quickcheck) {
        return quickcheck.element(by.css(component.copyQcPanel));
    }

    async function getCopyQuickCheckName(quickcheck) {
        return await quickcheck.element(by.css(component.copyQcName)).getAttribute('value');
    }

    function getCopySelectSetDropdownOptions(quickcheck) {
        return quickcheck.element(by.css(component.copyQcSetSelect)).all(by.css('option'));
    }

    async function getCopySelectSetDropdownValue(quickcheck) {
        return await quickcheck.element(by.css(component.copyQcSetSelect)).element(by.css('option:checked')).getText();
    }

    function getCopySelectSubsetDropdownOptions(quickcheck) {
        return quickcheck.element(by.css(component.copyQcSubsetSelect)).all(by.css('option'));
    }

    async function getCopySelectSubsetDropdownValue(quickcheck) {
        return await quickcheck.element(by.css(component.copyQcSubsetSelect)).element(by.css('option:checked')).getText();
    }

    function getDeleteQcBtn(quickcheck) {
        return quickcheck.element(by.css(component.deleteQcBtn));
    }

    function getDeleteSubsetBtn() {
        return component.deleteSubsetBtn;
    }

    function getEditSubsetBtn() {
        return component.editSubsetBtn;
    }

    function getEditSubsetInput() {
        return component.editSubsetInput;
    }

    function getName() {
        return component.name.getText();
    }

    function getNewQcInput() {
        return component.newQcInput;
    }

    function getQuickChecks() {
        return component.quickChecks;
    }

    async function previewQuickCheck(quickCheck) {
        await quickCheck.element(by.css(component.previewQcBtn)).click();
    }

    async function saveQuickCheck() {
        await component.saveQcBtn.click();
    }

    function setSubset(subset) {
        component.subset = subset;
    }

    async function submitCopy(quickcheck) {
        await quickcheck.element(by.css(component.copyQcSubmitBtn)).click();
    }

    async function submitEditedSubset(name) {
        var input = this.getEditSubsetInput();
        await input.sendKeys(name);
        await input.sendKeys(protractor.Key.ENTER);
    }

    async function toggleAccordion() {
        await component.header.click();
        await component.browser.sleep(1000); //wait for animation to finish
    }
}

module.exports = SubsetPanelComponent;