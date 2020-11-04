var browser2 = browser.params.browser2,
    includes = require('../common/includes.js'),
    data = includes.data,
    common = new includes.Common(browser2),
    canvasAssignmentsPage = new includes.CanvasAssignmentsPage(browser2),
    canvasModulesPage = new includes.CanvasModulesPage(browser2),
    qcPage = new includes.QcPage(browser2);

describe('Taking a non-graded quiz', function() {
    var qcName = data.sets.featuresAllOff.quickchecks.urlEmbed,
        quizData = data.quizData.quiz2;

    it('should show the quiz title when a title has been added', async function() {
        await common.switchToCanvas();
            await canvasAssignmentsPage.goToModules();
            await canvasModulesPage.selectItemByLinkText(qcName);
            //this looks odd, but the problem is that changing browser synchronization for angular
            //and non-angular pages is synchronous rather than asynchronous, so I learned I had to
            //be careful about changing back to angular-specific stuff in the right spot in the
            //control flow, otherwise, it would fire off out of order and give an error saying that
            //angular was not on the window. tricky stuff!
            await common.switchToLtiTool();
            await common.enterAngularPage();
            expect(await qcPage.getTitle().getText()).toBe(qcName.toUpperCase());
    });

    it('should show the quiz description when a description has been added', async function() {
        expect(await qcPage.getDescription().getText()).toBe('Description');
    });

    it('should reward partial credit for a half-correct matrix question', async function() {
        await qcPage.selectMatrixCheckboxByIndex(quizData.question1.answer1);
        await qcPage.selectMatrixCheckboxByIndex(quizData.question1.answer2 + 1);
        await qcPage.submit();
        expect(await qcPage.getScore()).toBe('0.5 / 2 questions correct');
        await qcPage.clickRowContinue();
    });

    it('should reward partial credit for a half-correct matching question', async function() {
        await qcPage.selectOption(0, quizData.question2.answer1); //correct
        await qcPage.selectOption(1, quizData.question2.answer1); //incorrect
        await qcPage.submit();
        expect(await qcPage.getScore()).toBe('1 / 2 questions correct');
        await qcPage.clickRowContinue();
    });

    it('should show a message that the quiz was not graded after completing', async function() {
        expect(await qcPage.isQcFinished()).toBe(true);
        expect(await qcPage.isQcUngraded()).toBe(true);
    });

    it('should show directions to click the module next button when in a module', async function() {
        expect(await qcPage.isModuleMessagePresent()).toBe(true);
    });
});


//take the 3rd quiz, where grading is manual and past due
describe('Taking a manually graded quiz past the due date', function() {
    var qcName = data.sets.featuresAllOff.quickchecks.featuresAllOffPastDue,
        questionData = data.quizData.quiz3.question1;

    it('should mark a numerical question as correct if an exact answer match', async function() {
        await common.switchToCanvas();
        await canvasAssignmentsPage.goToAssignments();
        await canvasAssignmentsPage.openAssignment(qcName);
        //refresh so we can test if empty attempts are actually hidden
        await browser2.refresh();
        await common.switchToLtiTool();
        await common.enterAngularPage();
        await qcPage.enterNumericalAnswer(questionData.option1.exact);
        await qcPage.submit();
        expect(await qcPage.isCorrectModal()).toBe(true);
        await qcPage.clickContinue();
        await qcPage.restart();
    });

    it('should mark a numerical question correct if it falls within a margin of error', async function() {
        var answer = +(questionData.option2.exact) - +(questionData.option2.margin);
        await qcPage.enterNumericalAnswer(answer);
        await qcPage.submit();
        expect(await qcPage.isCorrectModal()).toBe(true);
        await qcPage.clickContinue();
        await qcPage.restart();
    });

    it('should mark a numerical question correct if it falls within a range', async function() {
        await qcPage.enterNumericalAnswer(questionData.option3.rangeMin);
        await qcPage.submit();
        expect(await qcPage.isCorrectModal()).toBe(true);
        await qcPage.clickContinue();
        await qcPage.restart();
    });

    it('should mark a numerical question incorrect if it falls outside of all ranges', async function() {
        var answer = +(questionData.option3.rangeMax) + 1;
        await qcPage.enterNumericalAnswer(answer);
        await qcPage.submit();
        expect(await qcPage.isIncorrectModal()).toBe(true);
        await qcPage.clickContinue();
    });

    it('should show a message that a grade was not submitted if it is past the due date', async function() {
        expect(await qcPage.isQcFinished()).toBe(true);
        expect(await qcPage.isQcUngraded()).toBe(true);
    });
});

//take the 4th quiz, where auto-grade will be used, in the collection with all features turned off
//nothing specifically to test here in the student view, just need to take the quiz, but leaving this here in case
//also, navigate to page and refresh, to test feature functionality of showing empty attempts
describe('Taking a quiz with responses hidden', function() {
    var qcName = data.sets.featuresAllOff.quickchecks.resultsNotReleased;

    it('should show a message that the quiz was not graded but will be later when completing', async function() {
        await common.switchToCanvas();
        await canvasAssignmentsPage.goToAssignments();
        await browser2.sleep(5000); //every once in a while would hit the timeout limit for too many attempts, slow down as a precaution
        await canvasAssignmentsPage.openAssignment(qcName);
        //refresh so we can test if empty attempts are actually hidden
        await browser2.refresh();
        await common.switchToLtiTool();
        await common.enterAngularPage();
        //pick an incorrect answer
        await qcPage.selectMcOptionByIndex(0);
        await qcPage.submit();
        await qcPage.clickContinue();
        expect(await qcPage.isQcFinished()).toBe(true);
        expect(await qcPage.isQcPendingGrade()).toBe(true);
    });
});

//Since there was a bug with taking 2 quizzes that both had grade passback, added this test in, using the QTI import quiz
//since the quiz was already available. Make sure that we get 1/1 correct so there is a grade to pass back in the first place.
//this one was randomized by default in the QTI import, so we have to hunt for the right answer.
describe('Taking a second graded quiz from QTI import', function() {
    var qcName = data.sets.featuresAllOn.quickchecks.qtiImportGraded;

    it('should show a successfully graded message after completion', async function() {
        await common.switchToCanvas();
        await canvasAssignmentsPage.goToAssignments();
        await canvasAssignmentsPage.openAssignment(qcName);
        //refresh so we can test if empty attempts are actually hidden
        await browser2.refresh();
        await common.switchToLtiTool();
        await common.enterAngularPage();
        //really doesn't matter what we select here, just pick the first one
        await qcPage.getMcOptions().each(async function(option, index) {
            const text = await option.getText();
            if (text.indexOf('B') > -1) {
                await qcPage.selectMcOptionByIndex(index);
            }
        });
        await qcPage.submit();
        await qcPage.clickContinue();
        expect(await qcPage.isQcFinished()).toBe(true);
        expect(await qcPage.isQcGraded()).toBe(true);
    });
});