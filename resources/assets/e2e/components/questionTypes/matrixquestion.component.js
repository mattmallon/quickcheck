var MatrixQuestionComponent = function(browserRef, question) {
    var component = this;
    component.browser = browserRef;
    component.question = question;

    //elements
    component.matrixAddColumnBtn = component.question.element(by.partialButtonText('Add column'));
    component.matrixAddRowBtn = component.question.element(by.partialButtonText('Add row'));
    component.matrixCheckboxes = component.question.all(by.css('table input[type="radio"]'));
    component.matrixColumns = component.question.all(by.css('.qc-edit-matrix-column'));
    component.matrixRows = component.question.all(by.css('.qc-edit-matrix-row'));
    component.matrixTextInputs = component.question.all(by.css('table input[type="text"]'));

    //strings for sub-elements

    //functions
    component.addMatrixColumn = addMatrixColumn;
    component.addMatrixRow = addMatrixRow;
    component.getMatrixCheckboxes = getMatrixCheckboxes;
    component.getMatrixColumns = getMatrixColumns;
    component.getMatrixRows = getMatrixRows;
    component.getMatrixTextInputs = getMatrixTextInputs;

    async function addMatrixColumn() {
        await component.matrixAddColumnBtn.click();
    }

    async function addMatrixRow() {
        await component.matrixAddRowBtn.click();
    }

    function getMatrixCheckboxes() {
        return component.matrixCheckboxes;
    }

    function getMatrixColumns() {
        return component.matrixColumns;
    }

    function getMatrixRows() {
        return component.matrixRows;
    }

    function getMatrixTextInputs() {
        return component.matrixTextInputs;
    }
}

module.exports = MatrixQuestionComponent;