/*
 * Grid is a two-dimensional array containing cell objects.
 * Parallel to this is a DOM table object, with each cell having an associated td object.
 */

var grid = (function() {

    "use strict";


    // >> Grid generation, and finding column references from the column index.

    // Starting dimensions of the spreadsheet grid, x number of columns and y number of rows.
    var initialDimensions = {x: 58, y: 45};

    var gridArray = [],
        tableEl = document.querySelector('#spreadsheetContainer table');

    // Create a row of cells and append at the given index. If no index is given, row is appended as the final row.
    var createRow = function(index) {

        // If index is 0 or not given, append the row as the final row.
        // The first automatically generated row is the headings row. Other than that, we can't append rows at index 0.
        var index = index ? index : gridArray.length;

        // Create row array and append it at the given index.
        gridArray.splice(index, 0, []);

        // If there are no rows on the grid, length of the newly created row is set by initialDimensions.
        // Otherwise, newly created row is the same length as the existing rows.
        var rowLength = gridArray[0].length ? gridArray[0].length : initialDimensions.y;

        var trEl = document.createElement('tr');

        // Create the cells within the row.
        for (var colIndex = 0, xLength = initialDimensions.x; colIndex < xLength; colIndex++) {

            // Create grid squares within row. The grid square's td object will be appended to the argument tr object.
            // Create heading cells if the row or column is index 0.
            if (index !== 0 && colIndex !== 0) {
                gridArray[index].push( createCell(trEl) );
            } else {
                gridArray[index].push( createHeadingCell(trEl) );
            }

        }

        // Append 'tr' object to table.
        domUtils.appendAtIndex(tableEl, trEl, index);

    };


    // Takes a one-based column index as an argument, and returns the string column reference.
    // For example, 1 is "A", 53 is "BA", 702 is "ZZ" and 703 is "AAA".
    // Each character in the reference is 26^n. So, "BB" is 2x26^1 + 2x26^0.
    // There are 26 letters in the alphabet.
    var computeColReference = function(index) {

        var referenceString = "";

        // Returns a summed series of 26^n. If 'n' is 2, it will return 26^2 + 26^1 + 26^0.
        var series = function(n) {
            var total = 0;
            while (n >= 0) {
                total += Math.pow(26, n);
                n--;
            }
            return total;
        };

        // topPower is the highest power of 26 in the series that will fit into the index.
        // topPower for 702 is 1, as 702 >= (26^1 + 26^0).
        // topPower for 703 is 2, as 703 >= (26^2 + 26^1 + 26^0).
        var topPower = 0;
        while (index >= series(topPower)) {
            topPower++;
        }
        topPower--;

        // Each iteration creates a character in the reference string, leftmost characters first.
        while (topPower >= 0) {

            // 'index-series(topPower-1)' is the amount that can be used for the character being generated.
            // For example, if index was 80, 26^0 (ie 1) must be reserved as the minimum amount for the lower character.
            // This leaves 79 for the 26^1 index character.
            // 26^1 goes into 79 3.04 times, meaning that the character index is 3, ie "C".
            // It also leaves 2 remainder from the index variable, for the 26^0 index character.
            // The index variable is now assigned this value for the next iteration.
            var charIndex = Math.floor( (index - series(topPower-1)) / Math.pow(26, topPower) );

            index -= charIndex * Math.pow(26, topPower);

            // The Unicode / ASCII code for "A" is 65. Our charIndex is a one-based index, so "A" is 1.
            referenceString += String.fromCharCode(charIndex + 64);

            topPower--;

        }

        return referenceString;

    };

    // Generates and writes the row heading references. Invoking without an argument will write all row headings.
    var writeRowHeadings = function(currentRow) {
        if (!currentRow) {currentRow = 1;}
        for (var cols = gridArray.length; currentRow < cols; currentRow++) {
            gridArray[currentRow][0].setHeadingValue(currentRow);
        }
    };

    // Generates and writes the column heading references. Invoking without an argument will write all column headings.
    var writeColHeadings = function(currentCol) {
        if (!currentCol) {currentCol = 1;}
        for (var rows = gridArray[0].length; currentCol < rows; currentCol++) {
            gridArray[0][currentCol].setHeadingValue( computeColReference(currentCol) );
        }
    };

    // Generate grid array and DOM objects. Happens once, when the page is loaded.
    for (var rowIndex = 0, yLength = initialDimensions.y; rowIndex < yLength; rowIndex++) {
        createRow();
    }
    writeRowHeadings();
    writeColHeadings();

    // >> End grid generation, and finding column references from the column index.



    // >> Functions to deal with cell creation and deletion, and row sorting.

    // Removes and destroys the row of cells containing the argument cell object from the grid and the DOM.
    var destroyRow = function(cellObject) {

        // The grid must have at least one row.
        if (gridArray.length <= 2) { return; }

        var rowIndex = findCellIndex(cellObject).row,
            rowArray = gridArray[rowIndex];

        // Remove the row from the gridArray. This must be done before invoking destroy() on the cells,
        // as dependent cells tell if a cell has been destroyed by it being absent from the grid.
        gridArray.splice(rowIndex, 1);

        // Destroy the cell objects within the row.
        // This is needed to tell dependent and referenced cells objects of the destroyed cell.
        rowArray.forEach( function(el) { el.destroy(); } );

        var trObject = tableEl.querySelector( 'tr:nth-of-type(' + (rowIndex+1) + ')' );
        tableEl.removeChild(trObject);

        writeRowHeadings(rowIndex);
    };

    var destroyColumn = function(cellObject) {

        // The grid must have at least one column.
        if (gridArray[0].length <= 2) { return; }

        var colIndex = findCellIndex(cellObject).col;

        // The entire column must all be removed before destroy() is invoked, so that regenerated cell references
        // within formulas are accurate. eg "=E5" would become "=D5" if column B was removed, but this would only happen
        // after column B was completely removed, rather than just cell B5.
        var removedCells = [];

        // Remove and then destroy each cell. Each cell's destroy() method also removes its DOM td object.
        for (var i = 0, len = gridArray.length; i < len; i++) {
            removedCells.push( gridArray[i].splice(colIndex, 1)[0] );
        }
        removedCells.forEach( function(el) {el.destroy()} );

        writeColHeadings(colIndex);
    };

    // >> End cell creation, deletion and sorting functions.



    // >> Functions to find a cell from its string reference.

    // Takes a full valid cell reference string as an argument, eg "A5", and returns the row reference, eg "5".
    var extractRowReference = function(referenceString) {
        return referenceString.replace( /[A-Z]+/, '' ).match( /[0-9]+/ ).join('');
    };

    // Takes a full valid cell reference string as an argument, eg "A5", and returns the column reference, eg "A".
    var extractColReference = function(referenceString) {
        return referenceString.match( /[A-Z]+/ ).join('');
    };

    // Takes a column reference string as an argument, eg "A", and returns the index of the corresponding column in the
    // gridArray object, eg 1. This is basically the reverse of computeColReference().
    // Each letter is a power of 26, so "AAA" is 1x26^3 + 1x26^2 + 1x26^1. colReference letters must be uppercase.
    var computeColIndex = function(colReference) {
        var index = 0;
        for (var i = 0, length = colReference.length; i < length; i++) {
            // Note that subtracting 64 turns the unicode character code into the letter's position, eg "C" is 3.
            index += (colReference.charCodeAt(i)-64) * Math.pow(26, length-i-1);
        }
        return index;
    };

    // Takes an attempted reference string as an argument, eg "A5", and returns the associated cell object.
    // If a corresponding cell object doesn't exist, an error message string is returned.
    var findCellObject = function(referenceString) {

        var uReferenceString = referenceString.toUpperCase();

        // referenceString must be [zero or more whitespace][one or more A-Z][one or more 0-9][zero or more whitespace].
        if ( !/^\s*[A-Z]+\d+\s*$/.test(uReferenceString) ) {
            return "The characters " + referenceString + " are not valid a cell reference.";
        }

        var row = extractRowReference(uReferenceString),
            col = computeColIndex( extractColReference(uReferenceString) );

        // Return the cell object if the grid co-ordinates exist, otherwise return the error string.
        if (gridArray[row] && gridArray[0][col]) {
            return gridArray[row][col];
        } else {
            return "The cell reference " + referenceString + " isn't on the grid.";
        }

    };

    // >> End functions to find a cell from its string reference.


    // Returns the index of the argument within the gridArray, in the format {row: 5, col: 7}.
    // Returns -1 if the argument is not an element in the gridArray.
    var findCellIndex = function(el) {
        for (var rowIndex = 1, rows = gridArray.length; rowIndex < rows; rowIndex++) {
            var cellIndex = gridArray[rowIndex].indexOf(el);
            if (cellIndex !== -1) {
                return {row: rowIndex, col: cellIndex};
            }
        }
        return -1;
    };

    // Returns the reference string of the argument if it is an element in the gridArray, eg "A5".
    // If the argument is not an element in the gridArray, returns -1.
    var computeCellReference = function(el) {
        var index = findCellIndex(el);
        return (index !== -1) ? (computeColReference(index.col) + index.row) : index;
    };

    // Takes a formula function string as an argument, eg "SUM(B15, A1)", and returns an object.
    // The other argument is the cellObject that invoked the method, so it can be checked as not present in the range.
    // If function valid, returns the result and an array of the range cells, {value: 5, rangeCells: [{A1}, {A2}, etc]}.
    // If function is not valid, returns an error message string, {message: ""}.
    // The function string should already have been vetted as having valid syntax, and the delimiter cells as existing.
    var computeFormulaFunction = function(cellObject, funcString) {
        console.log('grid.computeFormulaFunction invoked, arg: ' + funcString);

        // Get the function type, and remove it from the argument string, leaving "(B15:A1)".
        var funcNames = /(SUM|MEAN|MAX|MIN)/,
            funcName = funcString.match(funcNames)[0],
            funcString = funcString.replace(funcNames, '');

        console.log('... funcName is: ' + funcName + ', funcString is now: ' + funcString);

        // Find the top left and bottom right coordinates in the range (the given cells could be the opposites).
        // This creates two arrays giving the index coordinates, eg rows [15, 1] and cols [2, 1].
        var rows = funcString.match(/\d+/g),
            cols = funcString.match(/[A-Z]+/g).map( function(el) { return computeColIndex(el) } );

        console.log('... range index rows: ' + rows + ' cols: ' + cols );

        // Order the rows and cols, leaving rows [1, 15] and cols [1, 2].
        var sortInOrder = function(firstEl, secondEl) { return firstEl - secondEl };
        rows.sort(sortInOrder);
        cols.sort(sortInOrder);

        console.log('... range index rows: ' + rows + ' cols: ' + cols);

        // Add all the cell objects in the range to the cellsInRange array, creating [{A1}, {A2}, {A3} ...etc].
        var cellsInRange = [];
        for (var i = rows[0], len = rows[1]; i <= len; i++) {
            for (var j = cols[0], l = cols[1]; j <= l; j++) {
                //console.log('... i: ' + i + ' j: ' + j + ' cell: ' + gridArray[i][j]);
                cellsInRange.push(gridArray[i][j]);
                console.log('... cell ' + grid.computeCellReference(cellsInRange[cellsInRange.length-1]) + ' added to cellsInRange array.');
            }
        }

        // Return an error message if the cell itself is contained within the range, to avoid a recursive function.
        if ( cellsInRange.indexOf(cellObject) !== -1 ) {
            return { message: "Self-reference within the function range." };
        }

        // Number values in the range, eg [5, 2, 77].
        // Values from empty cells, and those with string values, are not included.
        var valuesInRange = [];
        for (var i = 0, len = cellsInRange.length; i < len; i++) {
            var value = cellsInRange[i].getComputedValue();
            if ( (value !== null) && ( !isNaN( Number(value) ) ) ) {
                valuesInRange.push( Number(value) );
            }
        }

        // If there are no number values in the range, return zero as the value of the function.
        if (valuesInRange.length === 0) {
            return {
                value: 0,
                rangeCells: cellsInRange,
            };
        }

        console.log('valuesInRange: ' + valuesInRange);

        // Return the value of the function, and the cells within the range (that the calling cell is now dependent on).
        switch (funcName) {

            case "SUM":
                console.log('SUM matched in switch statement');
                return {
                    value: valuesInRange.reduce( function(total, el) { return total + el } ),
                    rangeCells: cellsInRange,
                };

            case "MEAN":
                return {
                    value: valuesInRange.reduce( function(total, el) { return total + el } ) / valuesInRange.length,
                    rangeCells: cellsInRange,
                };

            case "MAX":
                return {
                    value: valuesInRange.sort( function(firstEl, secondEl) { return secondEl - firstEl } )[0],
                    rangeCells: cellsInRange,
                };

            case "MIN":
                return {
                    value: valuesInRange.sort( function(firstEl, secondEl) { return firstEl - secondEl } )[0],
                    rangeCells: cellsInRange,
                };

        }

        return 1;
    };

    return {
        findCellObject: findCellObject,
        computeCellReference: computeCellReference, 
        computeFormulaFunction: computeFormulaFunction,
        destroyRow: destroyRow,
        destroyColumn: destroyColumn,
    };

}());
