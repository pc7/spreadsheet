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

    // Deappends the DOM tdObject from the trObject.
    var destroyView = function() {
        trObject.removeChild(tdObject);
    };

    // The error message associated with the cell, eg an invalid formula. Empty string if there is not a message.
    var errorMessage = (function() {
        var storedMessage = '';
        return {
            get: function() { return storedMessage },
            set: function(message) {
                // Reset message if no message is passed as an argument.
                storedMessage = message ? message : '';
                // If a new message is assigned while the cell is the active cell, display the message in the menu.
                if (tdObject.getAttribute('id') === 'activeCell') { menu.setMessage(message) }
            },
        };
    }());


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

    // Removes the cell from the DOM, and notifies referenced and dependent cells.
    var destroy = function() {
        destroyView();
        // Giving the cell any new value will notify referenced and dependent cells.
        valueIsNotFormula('');
    };

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
    var computedValue = (function() {
        // The computedValue is the value that is displayed within all non-active cells.
        var computedValue = null;
        return {
            // Set the computedValue to an arbitrary value.
            set: function(newValue) {
                String(newValue);
                // If the newValue is an empty string or nothing but whitespace, reset this as null.
                if  (newValue === '' || /^\s+$/.test(newValue) ) {
                    newValue = null;
                }
                if (computedValue !== newValue) {
                    computedValue = newValue;
                    if (computedValue !== null) {
                        // inputEl.value = computedValue;
                    } else {
                        // inputEl.value = '';
                    }
                    // If the computedValue is changed, tell the cells whose values are dependent on the value of this cell.
                    // The cellsDependentOnThisCells array will be changed during the dependent cells changing in value,
                    // so we need to work with a copy of the original that won't be changed during the loop.
                    cellsDependentOnThisCell.slice(0).forEach( function(el) { el.generateComputedValue(); } );
                    console.log( grid.computeCellReference(cellObject) + ' computedValue set to: ' + computedValue );
                } else {
                    console.log( grid.computeCellReference(cellObject) + ' computedValue unchanged from existing value, ' + computedValue );
                }
            },
            // Get the computedValue without re-evaluating the formula, when referenced cells in formula haven't changed.
            get: function() { return computedValue; },
            // Calculate the computedValue when user input is a formula, or when a cell referenced in formula is changed.
            generate: function() {
                console.log( 'generateComputedValue() invoked for cell ' + grid.computeCellReference(cellObject) );
                // If the cell has a formula value, generate the computedValue using the formulaStringTemplate.
                if (formulaString) {
                    evaluateFormulaTemplate();
                }
                return computedValue;
                // Make sure that setting computedValue is complete before invoking evaluateFormula() on dependent cells.
            },
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
    var addDependentCell = function(cellObj) {
        cellsDependentOnThisCell.push(cellObj);
    };

    // Remove one reference to a dependent cell object. Other references to the same cell will remain.
    var removeDependentCell = function(cellObj) {
        cellsDependentOnThisCell.splice( cellsDependentOnThisCell.indexOf(cellObj), 1 );
    };

    // Tell the dependent cells to regenerate their computed value, without changing the value of 'this' cell.
    // This is needed when a new row or column is added in the middle of a range.
    // eg 'this' cell is A3, and a dependent cell contains the formula range A2:A4. If a new row is added below A3, then
    // the dependent cell needs to be told to include the new cell in its range, even though none of the cells have
    // changed in value.
    var nudgeDependentCells = function() {
        cellsDependentOnThisCell.forEach( function(el) { el.generateComputedValue(); } );
    };

    // Returns true if cellObject is dependent on argument argCell, and false otherwise.
    // All the cell objects that cellObject is dependent on are checked for their own dependencies.
    // eg if cell A5 had the content "=B5" and cell B5 had the content "=C5", {A5}.isDependentOn({C5}) returns true.
    var isDependentOn = function(argCell) {
        for (var i = 0, len = cellsReferencedInFormula.length; i < len; i++) {
            var currentCell = cellsReferencedInFormula[i];
            if (currentCell === argCell || currentCell.isDependentOn(argCell) ) {
                return true;
            }
        }
        return false;
    };

    // Invoked when a new value is assigned that isn't a formula value. Resets all the formula-related fields.
    // The new value is passed as an argument.
    var valueIsNotFormula = function(newValue) {
        computedValue.set(newValue);
        formulaString = null;
        removeFormulaValues();        
    };

    // Resets formula-related values. Needed when a formula value is changed or removed.
    var removeFormulaValues = function() {
        removeFormulaReferences();
        errorMessage.set();
    };

    // Tells the cells that are referenced in the formula to remove this cell object from their cellsDependentOnThisCell
    // array. Then clears the cellsReferencedInFormula array.
    var removeFormulaReferences = function() {
        cellsReferencedInFormula.forEach( function(el) { el.removeDependentCell(cellObject) } );
        cellsReferencedInFormula = [];
    };

    // Invoked when the user tries to enter a formula value, but is not valid due to syntax errors, nonexistent references etc.
    var invalidFormula = function(newValue, message) {
        valueIsNotFormula(newValue);
        errorMessage.set(message);
    };

    // Initial processing of the user's entered value. Checks whether the user intends the value to be a formula.
    // rawInput is unprocessed value, eg "5" or " = a5 + 5 + sum(b1:b3)".
    // Checks if the rawInput begins with zero of more whitespace characters, followed by an '=' sign.
    // If so, then the user intends the input to be a formula, although it may not turn out to be valid.
    var handleRawInput = function(rawInput) {
        if (rawInput.match(/^\s*\=/)) {
            // Continue processing the formula.
            processFormulaSyntax(rawInput);
        } else {
            // rawInput is not a formula, so get rid of any previous formula value in the cell.
            valueIsNotFormula(rawInput);
        }
    };

    inputEl.addEventListener('change', function() { handleRawInput(inputEl.value) }, false);

    // The handleRawInput() function has shown that the user intends their input to be a formula.
    // The processFormulaSyntax() function checks formula syntax.
    // If the formula has valid syntax, processing will continue later to check for circular references etc.
    // If the syntax is not valid, the rawInput becomes the computedValue, and an error message is assigned.
    var processFormulaSyntax = function(rawInput) {

        // We know that the rawInput begins with an '=' sign and maybe whitespace, eg " = a5 + 5 + sum(b1:b3)".
        // Assign the formulaString. Will be reset to null later if the formula isn't valid.
        formulaString = rawInput.toUpperCase();
        formulaString = formulaString.replace(/\s/g, '');

        // formulaString is now "=A5+5+SUM(B1:B3)".
        // Problem in that whitespace within cell references isn't seen as an error, eg "b 3" becomes "B3".

        // Now remove the first '=' sign and validate formula syntax.
        var tempFormulaString = formulaString.replace(/\=/, '');

        //console.log('tempFormulaString is now: ' + tempFormulaString);

        // Validate formulaString as having valid syntax. 'valid' variable will be empty string if formula is valid.
        // Formula should be:
        //   One cell reference, or one or more digits, or one function, followed by one operator.
        //   Repeat the above line one or more times.
        //   Ending with one cell reference, or one or more digits, or one function.
        //   OR the whole thing consists only of one cell reference, or one or more digits, or one function.
        var valid = tempFormulaString.replace( /((([A-Z]+[0-9]+)|(\-?\d+(\.\d+)?)|((SUM|MEAN)\([A-Z]+[0-9]+\:[A-Z]+[0-9]+\)))[\+\-\*\/])+(([A-Z]+[0-9]+)|(\-?\d+(\.\d+)?)|((SUM|MEAN|MAX|MIN)\([A-Z]+[0-9]+\:[A-Z]+[0-9]+\)))|([A-Z]+[0-9]+)|(\-?\d+(\.\d+)?)|((SUM|MEAN|MAX|MIN)\([A-Z]+[0-9]+\:[A-Z]+[0-9]+\))/, '' );

        // If formula is not valid, stop processing.
        if (valid !== '') {
            //console.log('invalid formula syntax.');
            invalidFormula(rawInput, "Formula contains incorrect syntax. See the 'instructions' tab for limitations.");
            return;
        }

        //console.log('formula is valid');

        // Continue processing formula input by creating the formulaStringTemplate.
        createFormulaStringTemplate();

    };


    // The processFormulaSyntax() function has shown that the formulaString has valid syntax.
    // The formulaStringTemplate is created using the formulaString. Stop processing if fon-existent cell references.
    // If all cell references exist, processing will continue later to check for circular references etc.
    var createFormulaStringTemplate = function() {

        // The '=' sign in the formulaString is not needed.
        var tempFormulaString = formulaString.replace(/\=/, '');

        // Replace cell references with "#", find the associated cell objects, then add them into the array.
        // tempFormulaString for "A5+5+SUM(B1:B3)" will be "#+5+SUM(#:#)" and cellReferences will be ["A5", "B1", "B3"].
        var cellReferences = [];
        while (tempFormulaString.match(/[A-Z]+[0-9]+/)) {
            //console.log('reference string identified and replaced: ' + formulaString.match(/[A-Z]+[0-9]+/)[0]);
            cellReferences.push(tempFormulaString.match(/[A-Z]+[0-9]+/)[0]);
            tempFormulaString = tempFormulaString.replace(/[A-Z]+[0-9]+/, '#');
        }

        //console.log('tempFormulaString: '+tempFormulaString);

        // Replace the string references with cell objects.
        // So ["A5", "B1", "B3"] becomes [{cellObject}, {cellObject}, {cellObject}].
        // If there is no cell object, use the error message returned from the grid, and stop processing.
        for (var i = 0; i < cellReferences.length; i++) {
            var result = grid.findCellObject(cellReferences[i]);
            if (typeof result === "object") {
                cellReferences[i] = result;
            } else {
                invalidFormula(formulaString, result);
                return;
            }
        }

        //console.log('cellReferences: '+cellReferences, 'length: ' + cellReferences.length);

        // Replace the '#' elements, so formulaStringTemplate ia [{cellObject}, "+", "5", "+", "S", "U", "M" ... etc].
        formulaStringTemplate = tempFormulaString.split('');
        //console.log('formulaStringTemplate: '+formulaStringTemplate);
        for (var i = 0; i < formulaStringTemplate.length; i++) {
            if (formulaStringTemplate[i] === '#') {
                formulaStringTemplate[i] = cellReferences.shift();
            }
        }

        //console.log('formulaStringTemplate: '+formulaStringTemplate);

        // Merge the string elements within the formulaStringTemplate, creating its final form:
        // [{cellObject}, "+5+SUM(", {cellObject}, ":", {cellObject}, ")"]
        var i = 0;
        while (formulaStringTemplate[i]) {
            if ((typeof formulaStringTemplate[i] === "string") && (typeof formulaStringTemplate[i+1] === "string")) {
                //console.log('elements merged');
                formulaStringTemplate[i] = formulaStringTemplate[i] + formulaStringTemplate[i+1];
                formulaStringTemplate.splice(i+1, 1);
                i--;
            }
            i++;
        }

        //console.log('formulaStringTemplate: '+formulaStringTemplate);

        evaluateFormulaTemplate();

    };

    // Calcuate a new computedValue from the existing formulaStringTemplate.
    // The cell objects in the formulaStringTemplate existed when it was instantiated, but may have since been destroyed.
    // There may also be problems with circular references and self references, or maths operations on strings.
    // Any missing references will be replaced by "#", and that formulaString will become the computedValue, eg "=B5+#".
    // If there are no problems, a new computedValue will be assigned, as well as the cellsDependentOnThisCell and
    // cellsReferencedInFormula arrays.
    var evaluateFormulaTemplate = function() {

        /*
        // test to see if formulaString can be reconstituted.
        for (var i = 0; i < formulaStringTemplate.length; i++) {
            if (typeof formulaStringTemplate[i] === "object") {
                formulaStringTemplate[i] = grid.computeCellReference(formulaStringTemplate[i]);
            }
        }
        var x = formulaStringTemplate.join('');
        console.log('reconstituted formulaString: ' +x);
        // end test
        */

        // Bug: /^\d+([\+\-\*\/]\d+)+$/

        formulaString = "";

        // This will eventually be passed to eval() if the formula is valid.
        // eg for formulaString "A5+5+SUM(B1:B3)" the evalString would be "5+5+20".
        var evalString = "";

        // Will replace the cellsReferencedInFormula array if the formula is valid.
        // Needs to be re-generated every time the formulaStringTemplate is evaluated, as cells within a range may
        // have been destroyed, but the formula would still be valid.
        // The old cellsReferencedInFormula array must be kept for now, to enable prevention of circular references etc.
        var tempCellsReferencedInFormula = [];

        // Will contain a truthy error message string if the formula contains a cell reference that it shouldn't.
        var containsInvalidCell = false;

        // Loop through formulaStringTemplate.
        for (var i = 0, len = formulaStringTemplate.length; i < len; i++) {

            //console.log( 'Element ' + i + ' in formulaStringTemplate processing, value: ' + formulaStringTemplate[i] );

            // Only dealing with the cell objects in the formulaStringTemplate, not the strings.
            if (typeof formulaStringTemplate[i] === "object") {

                //console.log('... element is a cell object');

                var notValid = cellObject.isReferenceNotValid(formulaStringTemplate[i])

                //console.log( '... is cell object NOT valid to use in a formula in "this" cell: ' + notValid );

                // If the cell object is not valid for use in a formula in 'this' cell...
                if (notValid) {
                    // Replace the cell object with the string '#REF!' in the formulaStringTemplate.
                    // ["5+", {cellObject}, "-7"] would become ["5+", "#REF!", "-7"].
                    formulaStringTemplate[i] = '#REF!';
                    containsInvalidCell = notValid;
                    // Add "#REF!" to the formulaString.
                    formulaString += formulaStringTemplate[i];
                } else {
                    // Add the string cell reference of a valid cell to the formulaString, eg "A5".
                    formulaString += grid.computeCellReference(formulaStringTemplate[i]);
                    //console.log( '... ... formulaString is now: ' + formulaString );
                    // If cells are not part of a range (these will be dealt with later)...
                    if ((formulaStringTemplate[i-1] !== ":") && (formulaStringTemplate[i+1] !== ":")) {
                        //console.log('... ... cell is not part of a range.');
                        tempCellsReferencedInFormula.push(formulaStringTemplate[i]);
                        // Replace 'null' cell values with zero in the evalString.
                        var value = formulaStringTemplate[i].getComputedValue();
                        evalString += (value === null) ? 0 : value;
                    } else {
                        // Cell is part of a range.
                        //console.log('... ... cell is part of a range.');
                        evalString += grid.computeCellReference(formulaStringTemplate[i]);
                    }
                }
            } else {
                // Add string elements to the formulaString, eg "+5+SUM(".
                formulaString += formulaStringTemplate[i];
                evalString += formulaStringTemplate[i];
            }
            
        }

        formulaString = "=" + formulaString;
        //console.log( 'Non-function elements have been processed. formulaString is now completed: ' + formulaString );

        // The formulaString should now be completed, eg "=A5+5+SUM(B1:B3)" or "=A5+5+SUM(#REF!:B3).
        // The evalString should have non-function cells replaced with their values, eg "5+5+SUM(B1:B3)".
        // The tempCellsReferencedInFormula array should contain all the non-function cells, eg [{A5}].

        // If any cell references weren't valid for use in the formula, stop processing. 
        if (containsInvalidCell) {
            //console.log( 'formula contains invalid cell, so stop processing.' );
            invalidFormula(formulaString, containsInvalidCell);
            return;
        }

        // Replace all functions with their evaluated value, eg "SUM(A1:B1)+1" becomes "5+1".
        var functionRegex = /(SUM|MEAN|MAX|MIN)\([A-Z]+\d+\:[A-Z]+\d+\)/;
        //console.log( 'evalString is now: ' + evalString ) 
        //console.log( 'function regex matched: ' + functionRegex.test(evalString) ) 
        // While the evalString contains functions...
        while ( functionRegex.test(evalString) ) {
            var computedFunctionResult = grid.computeFormulaFunction( cellObject, evalString.match(functionRegex)[0] );
            //console.log('computedFunctionResult: ' + computedFunctionResult);
            // If the function was valid, computedFunctionResult will be {value: x, rangeCells: []}.
            // If not, computedFunctionResult will be {message: "error message"}.
            if ( "value" in computedFunctionResult ) {
                // If the grid method returns a number result, replace the function in the evalString with that number.
                evalString = evalString.replace(functionRegex, computedFunctionResult.value);
                //console.log('evalString function replaced, evalString is now: ' + evalString);
                // Add all the cells in the range to the temp referenced cells array.
                tempCellsReferencedInFormula = tempCellsReferencedInFormula.concat(computedFunctionResult.rangeCells);
                console.log('tempCellsReferencedInFormula is now: ' + tempCellsReferencedInFormula);
            } else {
                // If error message returned, then function (and therefore whole formula) is not valid.
                return invalidFormula(formulaString, computedFunctionResult.message);
            }
        }

        // Formulas that reach this point have valid syntax and valid cell references.
        //console.log('formula has valid syntax and valid references.');
        //console.log('evalString is now: ' + evalString);

        // Remove values from previous formula value.
        removeFormulaValues();

        // Add this cell as a dependent cell on the cells referenced in the formula.
        cellsReferencedInFormula = tempCellsReferencedInFormula;
        cellsReferencedInFormula.forEach( function(el) { el.addDependentCell(cellObject); } );

        // If the formula consists of only one cell reference, eg "=A5", then that cell can have a string value.
        if ((typeof formulaStringTemplate[0] === "object") && (formulaStringTemplate.length === 1)) {
            //console.log( 'formulaStringTemplate contains only one value. Return the value: ' + evalString ) 
            computedValue.set( evalString );
            return;
        }
 



        //console.log( 'evalString matched: ' + !!evalString.match(/^\-?\d+(\.\d+)?([\+\-\*\/](\-?\d+(\.\d+)?))*$/) )

        // Check if the evalString is in the format [one or more digits] with zero or more ([digits][operator]).
        // If so, then the evalString is correct, ie in the format "5+5", "8*9*10", "3", "20*250" etc.
        // If not, then we're trying to perform maths operations on strings.
        // The formula's syntax and references are still valid, and will evaluate to a number if the referenced cells
        // are given number values in future.
        // If the formulaStringTemplate contains only one reference, then this is also acceptable.
        // eg if cell A5 is the string "apples", another call can contain the formula "=A5" but not "=A5+1".
        if ( !evalString.match(/^\-?\d+(\.\d+)?([\+\-\*\/](\-?\d+(\.\d+)?))*$/) && formulaStringTemplate.length !== 1 ) {
            errorMessage.set("Formula contains maths operations on string values. See the 'instructions' tab for limitations.");
            computedValue.set(formulaString);
            return;
        }
        computedValue.set( eval(evalString) );

    };

    // Creates the formulaString using the formulaStringTemplate.
    // The formulaString needs to be re-generated every time it is shown, as the referenced cells may have changed
    // position (and need new string references), or have been destroyed.
    // Cell objects in the formulaStringTemplate are replaced by their computed values.
    // ["5+", {cellObject}, "-7"] will be turned into "=5+B2-7".
    var generateFormulaString = function() {

        // > create a tempString instead.
        var tempArray = [];
        for (var i = 0, len = formulaStringTemplate.length; i < len; i++) {
            if (typeof formulaStringTemplate[i] === "object") {
                tempArray[i] = formulaStringTemplate[i].evaluateFormulaTemplate();
            } else {
                tempArray[i] = formulaStringTemplate[i];
            }
        }
        formulaString = '=' + tempArray.join('');
    };

    // Takes a cell object as an argument, and checks if it is suitable to be used within formulas in 'this' cell object.
    // Checks if the argument cell object has been removed from the grid, and if it is a self or circular reference.
    // Returns an error message string if arg cell is not valid for use in formulas in this call, returns false otherwise.
    // eg if cell A5 contained "=B5" and B5 contained "=A5", {A5}.isReferenceNotValid({B5}) would return an error string.
    var isReferenceNotValid = function(argCell) {

        // Destroyed cellObjects have been removed from the gridArray, and are no longer part of the spreadsheet.
        if (grid.computeCellReference(argCell) === -1) {
            return "Formula contains a cell that has been removed from the grid.";
        }

        // Cells cannot refer to themselves in formulas, eg cell A5 cannot contain the formula "=A5".
        if (argCell === cellObject) { return "Formula contains a self-reference." }

        // Formulas cannot contain circular references, eg cell A5 contains "=A5" and B5 contains "=A5".
        // Check that the argument cell object, and the cells that is dependent on, are not dependent on 'this' cell.
        return argCell.isDependentOn(cellObject) ? "Formula contains a circular reference." : false;

    };

    // >> End processing user input.

    // Public methods.
    cellObject.makeActiveCell = makeActiveCell;
    cellObject.removeActiveCellStatus = removeActiveCellStatus;
    cellObject.getErrorMessage = errorMessage.get;
    cellObject.addDependentCell = addDependentCell;
    cellObject.removeDependentCell = removeDependentCell;
    cellObject.isDependentOn = isDependentOn;
    cellObject.getComputedValue = computedValue.get;
    cellObject.generateComputedValue = computedValue.generate;
    cellObject.isReferenceNotValid = isReferenceNotValid;
    cellObject.destroy = destroy;
    cellObject.nudgeDependentCells = nudgeDependentCells;

    return cellObject;

};
