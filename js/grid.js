/*
 * Grid is a two-dimensional array containing cell objects.
 * Parallel to this is a DOM table object, with each cell having an associated td object.
 */

var grid = (function() {

    "use strict";

    // Starting dimensions of the spreadsheet grid, x number of columns and y number of rows.
    var initialDimensions = {x: 58, y: 55};

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


    return {
 
    };

}());
