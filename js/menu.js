/*
 * Contains DOM menu controls, and handles the active cell.
 */

var menu = (function() {

    "use strict";

    // Reference to the current active cell object (the cell object in the gridArray, not the cell's DOM object).
    // Null if there is no current active cell.
    var activeCell = null;

    // The messageBar gives messages to the user, often error messages. Each cell object can have an associated message.
    // The nameBox is a text 'input' element into which the user can type cell references.
    var messageBar = document.getElementById('messageBar'),
        nameBox = document.getElementById('nameBox');

    // Invoked by a cell object when it becomes the active cell.
    var newActiveCell = function(cellObject) {

        // Remove active cell status from the previous active cell, and store a reference to the new active cell.
        if (activeCell) { activeCell.removeActiveCellStatus(); }
        activeCell = cellObject;

    };

    return {
        newActiveCell: newActiveCell, 
    };

}());
