var includes = require('../common/includes.js'),
    data = includes.data,
    canvasAssignmentsPage = new includes.CanvasAssignmentsPage(browser),
    canvasModulesPage = new includes.CanvasModulesPage(browser),
    common = new includes.Common(browser),
    embedPage = new includes.EmbedPage(browser),
    qcPage = new includes.QcPage(browser);

describe('Embedding assessments', function() {
    it('should show all collections in the modal window', async function() {
        var qcName = data.sets.featuresAllOn.quickchecks.featuresAllOn,
            setNames = [ data.sets.featuresAllOn.name, data.sets.featuresAllOff.name ];

        await common.closeTab(1);
        await common.switchTab(0);
        await common.enterNonAngularPage();
        //set due date to last day of year (if we just specify a string date that's month-specific, Canvas will assume this year)
        await canvasAssignmentsPage.createAssignmentAndOpenEmbed(qcName, '7', 'Dec 30');
        await common.enterAngularPage();
        setNames.forEach(async function(setName, index) {
            expect(await embedPage.getSets().get(index).getText()).toContain(setName);
        });
    });

    it('should show all assessment groups in the modal window', function() {
        var subsetNames = [
            data.sets.featuresAllOn.subsets.group1,
            data.sets.featuresAllOn.subsets.group2,
            data.sets.featuresAllOff.subsets.group1
        ],
            subsets = embedPage.getSubsets();

        subsetNames.forEach(async function(subsetName, index) {
            expect(await subsets.get(index).getText()).toContain(subsetName);
        });
    });

    it('should show all assessments in the modal window', function() {
        var qcGroup1 = data.sets.featuresAllOn.quickchecks,
            qcGroup2 = data.sets.featuresAllOff.quickchecks,
            qcNames = [
                qcGroup1.featuresAllOn,
                qcGroup1.qtiImportGraded,
                qcGroup1.qtiImportUngraded,
                qcGroup2.urlEmbed,
                qcGroup2.featuresAllOffPastDue,
                qcGroup2.resultsNotReleased
            ],
            quickchecks = embedPage.getQuickChecks();

        qcNames.forEach(async function(qcName, index) {
            expect(await quickchecks.get(index).getText()).toContain(qcName);
        });
    });

    it('should show search results when text is typed into the searchbar', async function() {
        var quizName = data.sets.featuresAllOn.quickchecks.featuresAllOn;

        await embedPage.search(quizName);
        expect(await embedPage.getSearchResults().count()).toBe(1);
        expect(await embedPage.getSearchResults().get(0).isDisplayed()).toBe(true);
        expect(await embedPage.getSearchResults().get(0).getText()).toContain(quizName);
    });

    it('should reset the search bar and results when clear search is clicked', async function() {
        await embedPage.clearSearch();
        expect(await embedPage.getSearchResults().count()).toBe(0);
    });

    it('should allow previewing the assessment in a new tab', async function() {
        var questionText = data.quizData.quiz1.question1.questionText;

        await embedPage.previewQuickCheckByIndex(0);
        await common.switchTab(1);
        await browser.sleep(1000);
        expect(await qcPage.getQuestionText()).toBe(questionText);

        //return to QC
        await browser.close();
        await common.switchTab(0);
        await common.switchToLtiToolEmbed();
        await common.enterAngularPage();
    });

    //the default view and search results view use separate markup, so make sure we are
    //testing both; previously had a bug where embedding from search results was broken
    it('should correctly embed the assessment when retrieved as a search result', async function() {
        var quizName = data.sets.featuresAllOn.quickchecks.featuresAllOn;

        await embedPage.search(quizName);
        await embedPage.selectSearchedQuickCheckByIndex(0);
        await common.switchToCanvas();
        await canvasAssignmentsPage.saveEmbed();
    });

    it('should allow for embedding a quiz as an external tool URL', async function() {
        var qcName = data.sets.featuresAllOff.quickchecks.urlEmbed;

        await canvasAssignmentsPage.goToModules();
        await canvasModulesPage.addModule('Test');
        await canvasModulesPage.addExternalToolLink();
        await  common.switchToLtiToolEmbed();
        await common.enterAngularPage();
        await embedPage.search(qcName);
        await embedPage.selectSearchedQuickCheckByIndex(0);
        await common.switchToCanvas();
        await canvasModulesPage.setExternalToolTitle(qcName);
        await canvasModulesPage.saveExternalTool();
        await canvasModulesPage.publishModuleItem();
        //click on the link, so we can log an instructor attempt, allowing us to view, then release results
        await browser.element(by.partialLinkText(qcName)).click();

    });

    //next, embed 2 more quizzes, just single questions, to test other functionality
    //(4 total quizzes for student to take--one with automatic grade passback, a second as an external url link,
    //a third to test manual grading, and a fourth to test auto-grade functionality)
    it('should embed the third quiz', async function() {
        var qcName = data.sets.featuresAllOff.quickchecks.featuresAllOffPastDue;
        await canvasAssignmentsPage.createAssignmentAndOpenEmbed(qcName, '1', 'Jan 1');
        await common.enterAngularPage();
        await embedPage.search(qcName);
        await embedPage.selectSearchedQuickCheckByIndex(0);
        await common.switchToCanvas();
        await canvasAssignmentsPage.saveEmbed();
    });

    it('should embed the fourth quiz', async function() {
        var qcName = data.sets.featuresAllOff.quickchecks.resultsNotReleased;
        await canvasAssignmentsPage.createAssignmentAndOpenEmbed(qcName, '1');
        await common.enterAngularPage();
        await embedPage.search(qcName);
        await embedPage.selectSearchedQuickCheckByIndex(0);
        await common.switchToCanvas();
        await canvasAssignmentsPage.saveEmbed();
    });

    //needed to add a second automatic grade passback quiz since there was a bug with this functionality; using the QTI import quiz
    //since it was already available
    it('should embed the QTI import quiz', async function() {
        var qcName = data.sets.featuresAllOn.quickchecks.qtiImportGraded;
        await canvasAssignmentsPage.createAssignmentAndOpenEmbed(qcName, '1');
        await common.enterAngularPage();
        await embedPage.search(qcName);
        await embedPage.selectSearchedQuickCheckByIndex(0);
        await common.switchToCanvas();
        await canvasAssignmentsPage.saveEmbed();
    });
});