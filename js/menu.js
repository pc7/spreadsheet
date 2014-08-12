/*
 * Written by P Cope.
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
        nameBox = document.getElementById('nameBox'),
        destroyRowButton = document.getElementById('destroyRow'),
        destroyColButton = document.getElementById('destroyColumn'),
        createRowButton = document.getElementById('createRow'),
        createColButton = document.getElementById('createColumn'),
        submitFunctionButton = document.getElementById('submitFunction'),
        selectFunctionName = document.getElementById('selectFunctionName'),
        firstRangeCell = document.getElementById('firstRangeCell'),
        secondRangeCell = document.getElementById('secondRangeCell');

    // Needed for enabling and disabling buttons as a group.
    var allButtons = [destroyRowButton, destroyColButton, createRowButton, createColButton, submitFunctionButton];

    // Keyboard navigation using 'Enter' key.
    document.addEventListener('keydown', function(evt) {
        if (!activeCell) { return; }
        //evt.preventDefault();
        switch (evt.keyCode) {
            case 13:
                grid.findCellBelow(activeCell).makeActiveCell();
                break;
            case 37:
                grid.findCellLeft(activeCell).makeActiveCell();
                break;
            case 38:
                grid.findCellAbove(activeCell).makeActiveCell();
                break;
            case 39:
                grid.findCellRight(activeCell).makeActiveCell();
                break;
            case 40:
                grid.findCellBelow(activeCell).makeActiveCell();
                break;
        }
    }, false);

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

    // Invoked by a cell object when it becomes the active cell, or when a cell loses active cell status.
    var newActiveCell = function(cellObject) {
        // If the active cell is being destroyed, no new active cell is given, so just set activeCell to null.
        // Also enable and disable buttons based on whether or not there is currently an active cell.
        if (!cellObject) {
            allButtons.forEach( function(el) { el.setAttribute('disabled', '') } );
            activeCell = null;
            grid.highlightHeadings();
            return;
        }
        // Remove active cell status from the previous active cell, and store a reference to the new active cell.
        if (activeCell && (activeCell !== cellObject)) { activeCell.removeActiveCellStatus(); }

        activeCell = cellObject;
        grid.highlightHeadings(cellObject);
        allButtons.forEach( function(el) { el.removeAttribute('disabled') } );
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

    // Add button handlers.
    destroyRowButton.addEventListener('click', function() { grid.destroyRow(activeCell); }, false);
    destroyColButton.addEventListener('click', function() { grid.destroyColumn(activeCell); }, false);
    createRowButton.addEventListener('click', function() { grid.createNewRow(activeCell); }, false);
    createColButton.addEventListener('click', function() { grid.createNewColumn(activeCell); }, false);
    submitFunctionButton.addEventListener('click', function() {
        activeCell.setInputValue('=' + selectFunctionName.value + '(' + firstRangeCell.value + ':' + secondRangeCell.value + ')');
        firstRangeCell.value = null;
        secondRangeCell.value = null;
        // If 'Enter' is pressed with the findCellBelow() handler, and the submitFunctionButton is also focused, this
        // causes a problem. Focus one of the range cells so that the button is not left as focused after the invokation.
        secondRangeCell.focus();
    }, false);

    return {
        newActiveCell: newActiveCell,
        setMessage: setMessage, 
    };

}());
