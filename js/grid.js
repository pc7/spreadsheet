/*
 * Copyright (c) P Cope 2014.
 * Grid is a two-dimensional array containing cell objects.
 * Parallel to this is a DOM table object, with each cell having an associated td object.
 */

var grid = (function() {

    "use strict";

    // >> Grid generation, and finding column references from the column index.

    // Starting dimensions of the spreadsheet grid, x number of columns and y number of rows, including headings.
    var initialDimensions = {x: 5, y: 15};

    var gridArray = [],
        tableEl = document.querySelector('#spreadsheetContainer table');

    // Create a row of cells and append at the given index. If no index is given, row is appended as the final row.
    var createRow = function(index) {

        // If index is 0 or not given, append the row as the final row.
        // The first automatically generated row is the headings row. Other than that, we can't append rows at index 0.
        var index = index || gridArray.length;

        // Create row array and append it at the given index.
        gridArray.splice(index, 0, []);

        var trEl = document.createElement('tr');

        // Create the cells within the row.
        // If there are no rows on the grid, length of the newly created row (xLength) is set by initialDimensions.
        // Otherwise, newly created row is the same length as the existing rows.
        for (var colIndex = 0, xLength = gridArray[0].length || initialDimensions.x; colIndex < xLength; colIndex++) {

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
    // Arguments are the first and last row indexes to have their headings rewritten.
    var writeRowHeadings = function(currentRow, limit) {
        if (!currentRow) {currentRow = 1;}
        if (!limit) {limit = gridArray.length-1;}
        for (; currentRow <= limit; currentRow++) {
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

    // Create a new grid and DOM row, appended after the argument cellObject's row.
    var createNewRow = function(cellObject) {
        // The index that the new row will have.
        var rowIndex = findCellIndex(cellObject).row + 1;
        createRow(rowIndex);
        // Loop through all cells in the new row...
        for (var i = 1, len = gridArray[0].length; i < len; i++) {
            // All non-heading cells tell their dependent cells to regenerate their computed values.
            // This will cause them to include the newly created cells in any ranges that span the newly created row.
            // If the new cell belongs in a range, the cell above it will also belong in that range.
            // So, invoke nudgeDependentCells() on the cell above the new cell. See nudgeDependentCells() for an example.
            gridArray[rowIndex-1][i].nudgeDependentCells();
        }
        writeRowHeadings(rowIndex);        
    };

    // Create a new grid and DOM column, appended after the argument cellObject's column.
    var createNewColumn = function(cellObject) {
        // The index that the new column will have.
        var colIndex = findCellIndex(cellObject).col + 1;

        // Loop through all grid and DOM rows, and add a newly created cell at the given column index.
        for (var rowIndex = 0, len = gridArray.length; rowIndex < len; rowIndex++) {
            var currentTrElement = domUtils.getNthChildOfType(tableEl, 'tr', rowIndex);
            if (rowIndex !== 0) {
                var newCell = createCell( currentTrElement, colIndex );
            } else {
                var newCell = createHeadingCell( currentTrElement, colIndex );
            }
            gridArray[rowIndex].splice( colIndex, 0, newCell );
            // Regenerate ranges in dependent cell formulas, avoiding the heading cells. See createNewRow() for details.
            if ((rowIndex > 0) && (colIndex > 1)) {
                gridArray[rowIndex][colIndex-1].nudgeDependentCells();
            }
        }

        writeColHeadings(colIndex);
    };

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

        var trObject = domUtils.getNthChildOfType(tableEl, 'tr', rowIndex);
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

    // Removes and returns a gridArray and DOM row from the given index. Returns {rowArray: [], trObject: {DOM object}}.
    // Row is not destroyed.
    var removeRow = function(rowIndex) {
        return {
            rowArray: gridArray.splice(rowIndex, 1)[0],
            trObject: tableEl.removeChild( domUtils.getNthChildOfType(tableEl, 'tr', rowIndex) ),
        };
    };

    // Takes an object containing a row array and tr object as an argument. {rowArray: [], trObject: {DOM object}}.
    // The row is appended to the gridArray and to the DOM, at the specified index.
    var appendRow = function(row, appendIndex) {
        gridArray.splice(appendIndex, 0, row.rowArray);
        domUtils.appendAtIndex(tableEl, row.trObject, appendIndex);
    };

    // Setup for the implementSort() function. Returns an error message if sort cannot happen.
    var sortRows = function(colReference, startRowIndex, endRowIndex, isDescending) {

        var colIndex = computeColIndex(colReference.toUpperCase());
        startRowIndex = Number(startRowIndex);
        endRowIndex = Number(endRowIndex);

        // Return an error message if the row or column doesn't exist.
        if (!gridArray[0][colIndex]) { return "Column " + colReference + " does not exist."; }
        if (!gridArray[startRowIndex] || (startRowIndex === 0)) { return "Row " + startRowIndex + " does not exist."; }
        if (!gridArray[endRowIndex] || (endRowIndex === 0)) { return "Row " + endRowIndex + " does not exist."; }

        // Swap row index values if they are the wrong way around.
        if (endRowIndex < startRowIndex) { var temp = startRowIndex; startRowIndex = endRowIndex; endRowIndex = temp; }

        // Select function to sort ascending or descending.
        var comparisonFunc = isDescending ? function(a, b) { return a > b; } : function(a, b) { return a < b; };

        // Returns true if the rows within the range contain a number value, false if not (only null and strings).
        var rowsContainNumberValue = function(firstRowIndex, lastRowIndex) {
            for (var i = firstRowIndex; i <= lastRowIndex; i++) {
                if ( gridArray[i][colIndex].hasNumberValue() ) {
                    return true;
                }
            }
            return false;
        };

        // Number of numbered cells in the sort area, ie cells that are not null or non-number strings.
        var numberOfNumberCells = (function() {
            var num = 0;
            for (var i = startRowIndex; i <= endRowIndex; i++) {
                if ( gridArray[i][colIndex].hasNumberValue() ) {
                    num++;
                }
            }
            return num;
        })();

        // Create a new sort area containing only the rows whose cells contain number values.
        // The non-number values sink to the bottom of the original sort area, and not included in the later sorting.
        // Loop through all rows in the sort area...
        for (var currentRowIndex = startRowIndex; currentRowIndex <= endRowIndex; currentRowIndex++) {

            // If the row has a number value, move it to the top of the sort area.
            if ( gridArray[currentRowIndex][colIndex].hasNumberValue() ) {
                // Remove the number row from the gridArray and DOM, and append to the start of the sort area.
                appendRow( removeRow(currentRowIndex), startRowIndex );
            }
        }

        // Invoke implementSort() with the new sort area, containing only number values.
        implementSort(colIndex, startRowIndex, (startRowIndex + numberOfNumberCells-1), comparisonFunc);

        writeRowHeadings(startRowIndex, endRowIndex);

    };

    // Sort rows by the values in the column index, using insertion sort. Column index is a zero-based number.
    // The startRowIndex and endRowIndex indexes are the lowest and highest row indexes in the current unsorted area.
    // Recursive function. Empty cells are always placed last, in both ascending and descending sorts.
    var implementSort = function(colIndex, startRowIndex, endRowIndex, comparisonFunc) {

        // Base case, which is reached when the unsorted area is down to just one row.
        if (startRowIndex >= endRowIndex) { return; }

        // Find the target row, with the highest value in the sorted area.
        // This row will be deappended and re-inserted in its sorted position.
        var targetRowIndex = startRowIndex,
            currentIndex = startRowIndex;

        while (currentIndex <= endRowIndex) {
            // The current row's value in its column by which the rows are sorted.
            var currentCell = gridArray[currentIndex][colIndex];

            // If the currently iterated row has a higher value than the target row, make it the new target row.
            // When the loop has finished, the target row will be the one with the highest value in that column.
            // Number() invokation is needed to turn negative number strings into numbers.
            if ( comparisonFunc( Number(currentCell.getComputedValue()), Number(gridArray[targetRowIndex][colIndex].getComputedValue() ) ) ) {
                targetRowIndex = currentIndex;
            }
            currentIndex++;
        }

        // Remove the target row from the gridArray and DOM.
        // Reappend the target row to the gridArray and DOM as the first row in the unsorted area.
        appendRow( removeRow(targetRowIndex), startRowIndex );

        // Recursive call, with the unsorted area decreased by one row.
        implementSort(colIndex, startRowIndex+1, endRowIndex, comparisonFunc);

    };

    // >> End cell creation, deletion and sorting functions.



    // >> Functions to find a cell from its string reference.

    // Takes a full valid cell reference string as an argument, eg "A5", and returns the row reference, eg "5".
    var extractRowReference = function(referenceString) {
        return referenceString.replace( /[A-Z]+/, '' ).match( /\d+/ ).join('');
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

    // Returns the cell object below the argument cell object.
    var findCellBelow = function(el) {
        var index = findCellIndex(el);
        // Return the argument cell if there is no cell below.
        if (index.row+1 === gridArray.length) { return el; }
        return gridArray[index.row+1][index.col];
    };

    var findCellAbove = function(el) {
        var index = findCellIndex(el);
        // Return the argument cell if there is no cell below.
        if (index.row-1 === 0) { return el; }
        return gridArray[index.row-1][index.col];
    };

    var findCellLeft = function(el) {
        var index = findCellIndex(el);
        // Return the argument cell if there is no cell below.
        if (index.col-1 === 0) { return el; }
        return gridArray[index.row][index.col-1];
    };

    var findCellRight = function(el) {
        var index = findCellIndex(el);
        // Return the argument cell if there is no cell below.
        if (index.col+1 === gridArray[0].length) { return el; }
        return gridArray[index.row][index.col+1];
    };

    // Takes a formula function string as an argument, eg "SUM(B15, A1)", and returns an object.
    // The other argument is the cellObject that invoked the method, so it can be checked as not present in the range.
    // If function valid, returns the result and an array of the range cells, {value: 5, rangeCells: [{A1}, {A2}, etc]}.
    // If function is not valid, returns an error message string, {message: ""}.
    // The function string should already have been vetted as having valid syntax, and the delimiter cells as existing.
    var computeFormulaFunction = function(cellObject, funcString) {

        // Get the function type, and remove it from the argument string, leaving "(B15:A1)".
        var funcNames = /(SUM|MEAN|MAX|MIN)/,
            funcName = funcString.match(funcNames)[0],
            funcString = funcString.replace(funcNames, '');

        // Find the top left and bottom right coordinates in the range (the given cells could be the opposites).
        // This creates two arrays giving the index coordinates, eg rows [15, 1] and cols [2, 1].
        var rows = funcString.match(/\d+/g),
            cols = funcString.match(/[A-Z]+/g).map( function(el) { return computeColIndex(el) } );

        // Order the rows and cols, leaving rows [1, 15] and cols [1, 2].
        var sortInOrder = function(firstEl, secondEl) { return firstEl - secondEl };
        rows.sort(sortInOrder);
        cols.sort(sortInOrder);

        // Add all the cell objects in the range to the cellsInRange array, creating [{A1}, {A2}, {A3} ...etc].
        var cellsInRange = [];
        for (var i = Number(rows[0]), len = Number(rows[1]); i <= len; i++) {
            for (var j = cols[0], l = cols[1]; j <= l; j++) {
                cellsInRange.push(gridArray[i][j]);
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

        // Return the value of the function, and the cells within the range (that the calling cell is now dependent on).
        switch (funcName) {

            case "SUM":
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

    // Removes the existing row and column heading highlighting.
    // If the argument is truthy, also adds the 'highlight' class to the 'th' element row and column headings,
    // of the row and column that contain the argument object.
    var highlightHeadings = function(el) {
        // Remove existing heading highlights.
        var highlighted = document.querySelectorAll('.highlighted');
        for (var i = 0, len = highlighted.length; i < len; i++) {
            highlighted[i].classList.remove('highlighted');
        }

        // If there is no new active cell, return after removing the existing highlighting.
        if (!el) { return; }

        // Add heading highlights for new active cell.
        var index = findCellIndex(el);
        tableEl.children[index.row].firstElementChild.classList.add('highlighted');
        tableEl.children[0].children[index.col].classList.add('highlighted');

    };

    return {
        findCellObject: findCellObject,
        computeCellReference: computeCellReference, 
        computeFormulaFunction: computeFormulaFunction,
        destroyRow: destroyRow,
        destroyColumn: destroyColumn,
        createNewRow: createNewRow,
        createNewColumn: createNewColumn,
        sortRows: sortRows,
        highlightHeadings: highlightHeadings,
        findCellBelow: findCellBelow,
        findCellAbove: findCellAbove,
        findCellLeft: findCellLeft,
        findCellRight: findCellRight,
    };

}());
