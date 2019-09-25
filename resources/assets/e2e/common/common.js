function Common(browserRef) {
    var common = this,
        EC = protractor.ExpectedConditions;

    common.browser = browserRef;
    common.browserWidth = 1200;
    common.browserHeight = 1000;
    common.randomizedOptionOrder = [];
    common.tinyMce = '#tinymce'; //css reference to get text in tinymce editor
    common.toolEmbedName = 'Quick Check (reg)';
    common.toolName = 'Quick Check (reg)';

    //functions
    common.acceptAlert = acceptAlert;
    common.areOptionsRandomized = areOptionsRandomized;
    common.closeTab = closeTab;
    common.enterAngularPage = enterAngularPage;
    common.enterNonAngularPage = enterNonAngularPage;
    common.enterTinyMceIframeInElement = enterTinyMceIframeInElement;
    common.enterTinyMceText = enterTinyMceText;
    common.getSelectedText = getSelectedText;
    common.getTinyMceIframeFromElement = getTinyMceIframeFromElement;
    common.getTinyMceText = getTinyMceText;
    common.goToQuickCheck = goToQuickCheck;
    common.leaveStudentView = leaveStudentView;
    common.leaveTinyMceIframe = leaveTinyMceIframe;
    common.refresh = refresh;
    common.saveOptionList = saveOptionList;
    common.setBrowserSize = setBrowserSize;
    common.switchTab = switchTab;
    common.switchToCanvas = switchToCanvas;
    common.switchToLtiTool = switchToLtiTool;
    common.switchToLtiToolEmbed = switchToLtiToolEmbed;
    common.waitForAngular = waitForAngular;

    async function acceptAlert() {
        const alert = await common.browser.driver.switchTo().alert();
        await alert.accept();
    }

    //this is specifically tied to the one randomized question we have, multiple choice, and its 4 options, so it
    //would be brittle if used elsewhere; not needed for now, but could be made more flexible if needed elsewhere
    function areOptionsRandomized() {
        var randomized = false;
        common.randomizedOptionOrder[0].forEach(function(options) {
            if (options[0] !== common.randomizedOptionOrder[1][0] || options[0] !== common.randomizedOptionOrder[2][0]) {
                randomized = true;
            }
            if (options[1] !== common.randomizedOptionOrder[1][1] || options[1] !== common.randomizedOptionOrder[2][1]) {
                randomized = true;
            }
            if (options[2] !== common.randomizedOptionOrder[1][2] || options[2] !== common.randomizedOptionOrder[2][2]) {
                randomized = true;
            }
            if (options[3] !== common.randomizedOptionOrder[1][3] || options[3] !== common.randomizedOptionOrder[2][3]) {
                randomized = true;
            }
        });
        return randomized;
    }

    async function closeTab() {
        await common.browser.close();
    }

    async function enterAngularPage() {
        await common.browser.driver.sleep(2000);
        common.browser.ignoreSynchronization = false;
        await common.browser.waitForAngularEnabled(true);
    }

    async function enterNonAngularPage() {
        common.browser.ignoreSynchronization = true;
        await common.browser.waitForAngularEnabled(false);
    }

    async function enterTinyMceIframeInElement(elem) {
        var frame = await common.getTinyMceIframeFromElement(elem, true);
        await common.browser.driver.switchTo().frame(frame.getWebElement());
        await common.enterNonAngularPage();
    }

    //although previous versions of angular/tinymce accepted sending text directly to the iframe, apparently doing so
    //at this point does not trigger an ng model update when sent directly using sendKeys(), and thus the changes appear
    //but are not updated in the data model and not saved. instead, go to source code panel to enter text there.
    async function enterTinyMceText(text, questionElement) {
        const viewButton = questionElement.all(by.css('.tox-menubar button')).get(2);
        await common.browser.wait(EC.presenceOf(viewButton), 10000);
        await viewButton.click();

        //this is added onto the DOM outside of the main tag, rather than inside of the question element...!
        const sourceCodeButton = common.browser.element(by.cssContainingText('.tox-collection__item', 'Source code'));
        await common.browser.wait(EC.presenceOf(sourceCodeButton), 10000);
        await sourceCodeButton.click();

        const textarea = common.browser.element(by.css('.tox-dialog__body textarea'));
        await common.browser.wait(EC.presenceOf(textarea), 10000);
        await textarea.sendKeys('<p>' + text + '</p>');
        const saveBtn = common.browser.element(by.buttonText('Save'));
        await saveBtn.click();
    }

    async function getSelectedText(select) {
        return await select.element(by.css('option:checked')).getText();
    }

    async function getTinyMceIframeFromElement(elem, wait = false) {
        const frame = elem.all(by.css('.tox-edit-area iframe')).first();
        if (wait) {
            await common.browser.wait(EC.presenceOf(frame), 10000);
        }
        return frame;
    }

    async function getTinyMceText() {
        return await common.browser.driver.findElement(by.css(common.tinyMce)).getText();
    }

    async function goToQuickCheck() {
        await common.browser.driver.findElement(by.linkText(common.toolName)).click();
        return await common.switchToLtiTool();
    }

    async function leaveStudentView() {
        await common.browser.driver.findElement(by.css('.leave_student_view')).click();
    }

    async function leaveTinyMceIframe() {
        await common.browser.driver.switchTo().defaultContent();
    }

    async function refresh() {
        return await common.browser.refresh();
    }

    async function saveOptionList(options) {
        var optionList = [];

        options.each(async function(mcOption) {
            const text = await mcOption.getText();
            optionList.push(text);
        });

        common.randomizedOptionOrder.push(optionList);
    }

    function setBrowserSize(width, height) {
        if (!width) {
            width = common.browserWidth;
        }
        if (!height) {
            height = common.browserHeight;
        }
        common.browser.driver.manage().window().setSize(width, height);
    }

    async function switchTab(tabIndex) {
        const handles = await common.browser.getAllWindowHandles();
        await common.browser.switchTo().window(handles[tabIndex]);
    }

    async function switchToCanvas() {
        await common.enterNonAngularPage();
        return await common.browser.driver.switchTo().defaultContent();
    }

    async function switchToLtiTool() {
        return await common.browser.driver.switchTo().frame(common.browser.driver.findElement(by.css('#tool_content')));
    }

    async function switchToLtiToolEmbed() {
        var iframe = '#resource_selection_iframe';
        //I really hate to use sleep(), but inconsistent errors with the iframe not showing up, and also was
        //getting errors with not finding bindings using EC since we are outside of an angular context
        await common.browser.driver.sleep(2000);
        return await common.browser.driver.switchTo().frame(common.browser.driver.findElement(by.css(iframe)));
    }

    async function waitForAngular() {
        await common.browser.wait(function () {
            return browser.executeScript('return !!window.angular');
        }, 10000, 'Timed out waiting for angular');
    }
}

module.exports = Common;