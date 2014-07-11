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

    // Set a new message in the messageBar. If no message is passed (eg empty string), messageBar is reset.
    var setMessage = function(message) {
        if (message) {
            messageBar.classList.add('hasMessage');
            messageBar.textContent = message;
        } else {
            messageBar.classList.remove('hasMessage');
            messageBar.textContent = '';
        }
    };

    // Invoked by a cell object when it becomes the active cell.
    var newActiveCell = function(cellObject) {
        // Remove active cell status from the previous active cell, and store a reference to the new active cell.
        if (activeCell && (activeCell !== cellObject)) { activeCell.removeActiveCellStatus(); }
        activeCell = cellObject;
        // Put the cell's string reference as the value of the nameBox.
        nameBox.value = grid.computeCellReference(cellObject);
        // Clear previous message and display the cell's error message if available.
        setMessage(cellObject.getErrorMessage());
    };

    // If a valid cell reference is entered, makeActiveCell() is invoked for that cell when the 'Enter' key is pressed.
    // If the submitted content isn't a valid cell reference, an error message is displayed in the messageBar.
    nameBox.addEventListener('keypress', function(eventObject) {
        if (eventObject.keyCode !== 13) { return; }
        var result = grid.findCellObject(nameBox.value);
        if (typeof result === "object") {
            result.makeActiveCell();
        } else {
            setMessage(result);
        }
    }, false)

    return {
        newActiveCell: newActiveCell,
        setMessage: setMessage, 
    };

}());
