var CanvasAssignmentsPage = function(browserRef) {
    var page = this,
        EC = protractor.ExpectedConditions;
    page.browser = browserRef;
    page.includes = require('../../common/includes.js');

    page.common = new page.includes.Common(page.browser);
    page.maxWait = 10000;

    //elements
    page.dueDate = page.browser.element(by.css('.DueDateInput'));
    page.embedBtn = page.browser.element(by.css('.ui-dialog-buttonset .add_item_button'));
    page.findExternalToolBtn = page.browser.element(by.css('#assignment_external_tool_tag_attributes_url_find'));
    page.nameInput = page.browser.element(by.css('#assignment_name'));
    page.navSettingsLink = page.browser.element(by.css('#section-tabs .settings'));
    page.newAssignmentBtn = page.browser.element(by.css('.new_assignment'));
    page.pointsPossible = page.browser.element(by.css('#assignment_points_possible'));
    page.saveBtn = page.browser.element(by.css('.save_and_publish'));
    page.studentViewBtn = page.browser.element(by.css('.student_view_button'));
    page.submissionType = page.browser.element(by.css('#assignment_submission_type'));
    page.toolLink = page.browser.element(by.css('#context_external_tools_select')).element(by.partialLinkText(page.common.toolEmbedName));

    //substring selectors
    page.assignmentsLink = '#section-tabs .assignments';
    page.ltiContent = '.tool_content_wrapper';
    page.modulesLink = '#section-tabs .modules';

    //functions
    page.createAssignment = createAssignment;
    page.createAssignmentAndOpenEmbed = createAssignmentAndOpenEmbed;
    page.enterAssignmentName = enterAssignmentName;
    page.enterPointsPossible = enterPointsPossible;
    page.getAssignmentLink = getAssignmentLink;
    page.goToAssignments = goToAssignments;
    page.goToModules = goToModules;
    page.goToSettings = goToSettings;
    page.goToStudentView = goToStudentView;
    page.openAssignment = openAssignment;
    page.saveEmbed = saveEmbed;
    page.selectExternalTool = selectExternalTool;
    page.setDueDate = setDueDate;

    async function createAssignment() {
        await page.browser.wait(EC.presenceOf(page.newAssignmentBtn), page.maxWait);
        await page.newAssignmentBtn.click();
    }

    async function createAssignmentAndOpenEmbed(assignmentName, assignmentPoints, dueDate) {
        await page.goToAssignments();
        await page.createAssignment();
        await page.enterAssignmentName(assignmentName);
        await page.enterPointsPossible(assignmentPoints);
        await page.setDueDate(dueDate);
        await page.selectExternalTool();
    }

    async function enterAssignmentName(assignmentName) {
        await page.browser.wait(EC.presenceOf(page.nameInput), page.maxWait);
        await page.nameInput.sendKeys(assignmentName);
    }

    async function enterPointsPossible(assignmentPoints) {
        await page.pointsPossible.clear();
        await page.pointsPossible.sendKeys(assignmentPoints);
    }

    async function getAssignmentLink(assignmentName) {
        //assuming there won't be multiple links with the assignment name; could add
        //additional selectors in the future beyond just the link text if necessary
        var link = page.browser.element(by.partialLinkText(assignmentName));
        await page.browser.wait(EC.presenceOf(link), page.maxWait);
        return link;
    }

    async function goToAssignments() {
        var link = page.browser.element(by.css(page.assignmentsLink));
        await page.browser.wait(EC.elementToBeClickable(link), page.maxWait);
        await link.click();
        await page.browser.sleep(2000); //was running into stale element errors without this
    }

    async function goToModules() {
        var link = page.browser.element(by.css(page.modulesLink));
        await page.browser.wait(EC.presenceOf(link), page.maxWait);
        await link.click();
    }

    async function goToSettings() {
        await page.browser.wait(EC.elementToBeClickable(page.navSettingsLink));
        await page.navSettingsLink.click();
    }

    async function goToStudentView() {
        await page.goToSettings();
        await page.browser.wait(EC.elementToBeClickable(page.studentViewBtn));
        await page.studentViewBtn.click();
    }

    async function openAssignment(assignmentName) {
        const link = await page.getAssignmentLink(assignmentName);
        let ltiContent;
        await page.browser.wait(EC.elementToBeClickable(link), page.maxWait);
        await link.click();
        ltiContent = page.browser.element(by.css(page.ltiContent));
        await page.browser.wait(EC.presenceOf(ltiContent), page.maxWait);
        await page.browser.wait(EC.visibilityOf(ltiContent), page.maxWait);
    }

    async function saveEmbed() {
        //LET ME TELL YOU about this. Please, have a seat. Get comfortable. Words cannot describe the
        //buffoonery of this. Why have a switchToCanvas() function when that was already called in the
        //wrapper? To quote Pee-Wee Herman: "I DON'T KNOW!" Wouldn't it suffice just to have a single
        //call to this function in the wrapper, or here directly in the function? ONE WOULD THINK SO.
        //For hours, I got failed after failed test, saying that protractor was not able to sync up
        //to the page, because angular was not found on the window. This was AFTER I had already called
        //the switchToCanvas() function to turn off browser synchronization and prevent such errors. You
        //want to know the best part? IT WORKS ON THE FIRST ASSIGNMENT, BUT NOT ON ASSIGNMENTS 3 AND 4.
        //Protractor apparently is a quantum testing framework, the results always change! GAHHHHH
        await page.common.switchToCanvas();
        await page.browser.sleep(1000); //and to top it all off, some sleep time due to inconsistencies
        await page.embedBtn.click();
        await page.saveBtn.click();
        await page.browser.wait(EC.stalenessOf(page.saveBtn), page.maxWait); //wait until we're redirected
    }

    async function selectExternalTool() {
        await page.submissionType.sendKeys('External');
        await page.findExternalToolBtn.click();
        await page.browser.wait(EC.presenceOf(page.toolLink), page.maxWait);
        //argh, sometimes the link is visible but when clicked, nothing opens, probably because
        //Canvas is still loading up components somewhere; so wait a couple extra seconds to
        //prevent tests inconsistently failing from time to time.
        await page.browser.sleep(2000);
        await page.toolLink.click();
        await page.common.switchToLtiToolEmbed();
    }

    async function setDueDate(dueDate) {
        await page.dueDate.clear();
        if (dueDate) {
            await page.dueDate.sendKeys(dueDate);
        }
    }
}

module.exports = CanvasAssignmentsPage;