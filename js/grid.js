/*
 * Grid is a two-dimensional array containing cell objects.
 * Parallel to this is a DOM table object, with each cell having an associated td object.
 */

var grid = (function() {

    "use strict";

    // Starting dimensions of the spreadsheet grid, x number of columns and y number of rows.
    var initialDimensions = {x: 8, y: 5};

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
                gridArray[index].push( createCell(trEl, index) );
            } else {
                gridArray[index].push( createHeadingCell(trEl, index) );
            }

        }

        // Append 'tr' object to table.
        domUtils.appendAtIndex(tableEl, trEl, index);

    };

    // Generate grid array and DOM objects. Happens once, when the page is loaded.
    for (var rowIndex = 0, yLength = initialDimensions.y; rowIndex < yLength; rowIndex++) {
        createRow();
    }


    return {
 
    };

}());
