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



    // >> Methods to find a cell from its string reference.

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

    // >> End methods to find a cell from its string reference.


    // Returns the index of a cell object within the grid, in the format {row: 5, col: 7}.
    var findCellIndex = function(cellObject) {
        for (var rowIndex = 1, rows = gridArray.length-1; rowIndex < rows; rowIndex++) {
            var cellIndex = gridArray[rowIndex].indexOf(cellObject);
            if (cellIndex !== -1) {
                return {row: rowIndex, col: cellIndex};
            }
        }
    };

    // Takes a cell object as an argument, and returns its reference string, eg "A5".
    var computeCellReference = function(cellObject) {
        var index = findCellIndex(cellObject);
        return computeColReference(index.col) + index.row;
    };

    return {
        findCellObject: findCellObject,
        computeCellReference: computeCellReference, 
    };

}());
