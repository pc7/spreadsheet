/*
 * Generates and returns a cell object, and an associated DOM td object. The DOM object is appended to the argument tr object at the given index.
 */

var createCell = function(trObject, index) {

    "use strict";

    // >> Generating the cell. Happens once, when cell is instantiated.

    // Each cell has an associated td DOM object.
    // The td object contains an 'input' element, which contains the computedValue.
    var tdObject = document.createElement('td'),
        inputEl = document.createElement('input');

    tdObject.appendChild(inputEl);
    domUtils.appendAtIndex(trObject, tdObject, index);

    // >> End generating the cell.

    // >> Basic cell fields and methods.

    // This is the cell object that will be returned.
    // Needs to be explicitly referred to in an event handler, so needs an identifier.
    var cellObject = {};

    // The error message associated with the cell, eg an invalid formula. Null if there is not a message.
    var errorMessage = null;

    var getErrorMessage = function() { return errorMessage };

    // Gives the cell active cell status. Active cell status is indicated by the tdObject having the '#activeCell' id.
    var makeActiveCell = function() {

        tdObject.setAttribute('id', 'activeCell');
        menu.newActiveCell(cellObject);

        // Need to explicitly focus the input element, as activeCell status can be given using the nameBox, rather than just clicking the cell.
        inputEl.focus();

    };

    var removeActiveCellStatus = function() {
        tdObject.removeAttribute('id');
    };

    // Make the cell the active cell if it is clicked on.
    tdObject.addEventListener('mousedown', function() {
        // Make the cell the active cell, if it isn't already.
        if (!tdObject.getAttribute('id', 'activeCell')) {
            // This is the method invokation which requires the cellObject to have an identifier.
            makeActiveCell();
        }
    }, false);

    // >> End basic cell fields and methods.

    // >> Processing user input.

    /*
     * Each cell has several types of value, which can be the same.
     * The rawInput value is the unprocessed string that is entered by the user. It is not stored permanently.
     * The rawInput could be something like "5" or " = a5 + 5".
     * The computedValue is the cell's value after processing.
     * Input is treated as a formula value if it is a valid formula, eg begins with an '=' sign and has valid syntax.
     * For non-formula values (including non-valid attempted formulas), the computedValue is simply the rawInput value.
     * For formula values, the computedValue is the value that the formula evaluates to, eg "10".
     *
     * For formula values, the formulaString is an allcaps string with whitespace removed, eg "=A5+5".
     * The formulaString is displayed as the cell's value when the cell is the active cell.
     * The formulaString needs to be newly generated every time a cell becomes the active cell.
     * This is because the referenced cell's locations and references can change, eg due to new rows/cols being added.
     * The formulaString is generated from the formulaTemplate, which would be in the format [{cellObject}, "+5"].
     */

    // Invoked when a new computedValue is needed, due to the user entering a new rawInput value, or cells that the
    // formula value is dependent on changing in value.
    var setComputedValue = (function() {
        // The computedValue is the value that is displayed within all non-active cells.
        var computedValue = null;
        return function(newValue) {
            String(newValue);
            if (computedValue !== newValue) {
                computedValue = newValue;
                inputEl.textContent = computedValue;
                // If the computedValue is changed, tell the cells whose values are dependent on the value of this cell.
            }
        };
    }());

    // Allcaps string value of the formula, with whitespace removed, eg "=A5+5", "=SUM(B3:B5)+C1+10".
    // Has the value 'null' if the cell doesn't have a valid formula as its value.
    // Displayed as the contents of the cell, rather than the computedValue, when the cell is the active cell.
    var formulaString = null;

    // Array of strings and cell objects, without the '=' sign at the start of the formula.
    // The cell objects will be replaced by their current cell references, to create the formulaString when needed.
    // Cells can change position and therefore change reference, so the formulaString needs to stay accurate by being
    // generated only when needed.
    // The formulaString "=SUM(A3:A5)+5" would become the formulaStringTemplate:
    // ["SUM(", {cellObject}, ":", {cellObject}, ")+5"].
    var formulaStringTemplate = null;

    // Array of cell objects that are referenced in the cell's formula, eg [{cellObject}, {cellObject}].
    // If the formulaString was "=A5+A7+3", then the array would contain the cell objects for the cells at A5 and A7.
    // Cell objects can appear more than once, eg "=A5+A5" would result in the array containing two references to {A5}.
    // If there are no referenced cells, or the value is not a formula, the array is empty.
    var cellsReferencedInFormula = [];

    // Array of cell objects whose own formulas reference this cell, eg {[cellObject}, {cellObject}].
    // If this cell was A5 and cell C5 contained the formula "=A5", then object {C5} would be in {A5}'s array.
    // As with the array above, cell objects can appear more than once, and the array is empty by default.
    var cellsDependentOnThisCell = [];

    // Adds a new cell object as a dependent cell.
    var addDependentCell = function(cellObject) { cellsDependentOnThisCell.push(cellObject); };

    // Remove one reference to a dependent cell object. Other references to the same cell will remain.
    var removeDependentCell = function(cellObject) {
        cellsDependentOnThisCell.splice( cellsDependentOnThisCell.indexOf(cellObject), 1 );
    };

    // Invoked when a new value is assigned that isn't a formula value. Resets all the formula-related fields.
    // The new value is passed as an argument.
    var valueIsNotFormula = function(newValue) {
        setComputedValue(newValue);
        formulaString = null;
        removeFormulaValues();        
    };

    // Resets formula-related values. Needed when a formula value is changed or removed.
    var removeFormulaValues = function() {
        removeFormulaReferences();
        errorMessage = null;
    };

    // Tells the cells that are referenced in the formula to remove this cell object from their cellsDependentOnThisCell
    // array. Then clears the cellsReferencedInFormula array.
    var removeFormulaReferences = function() {
        cellsReferencedInFormula.forEach( function(el) { el.removeDependentCell(cellObject) } );
        cellsReferencedInFormula = [];
    };

    // Initial processing of the user's entered value. Checks whether the user intends the value to be a formula.
    // Checks if the rawInput begins with zero of more whitespace characters, followed by an '=' sign.
    // If so, then the user intends the input to be a formula, although it may not turn out to be valid.
    var handleRawInput = function(rawInput) {
        if (rawInput.match(/^\s*\=/)) {
            // Continue processing the formula.
            console.log('formula');
        } else {
            console.log('not formula');
            // rawInput is not a formula, so get rid of any previous formula value in the cell.
            valueIsNotFormula(rawInput);
        }
    };

    inputEl.addEventListener('change', function() { handleRawInput(inputEl.value) }, false);

    // >> End processing user input.

    // Public methods.
    cellObject.makeActiveCell = makeActiveCell;
    cellObject.removeActiveCellStatus = removeActiveCellStatus;
    cellObject.getErrorMessage = getErrorMessage;
    cellObject.addDependentCell = addDependentCell;
    cellObject.removeDependentCell = removeDependentCell;

    return cellObject;

};
