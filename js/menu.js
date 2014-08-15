/*
 * Copyright (c) P Cope 2014.
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
        nameBoxButton = document.querySelector('#nameBox + button'),
        destroyRowButton = document.getElementById('destroyRow'),
        destroyColButton = document.getElementById('destroyColumn'),
        createRowButton = document.getElementById('createRow'),
        createColButton = document.getElementById('createColumn'),
        submitFunctionButton = document.querySelector('#setFunctionFormulaContent button'),
        selectFunctionName = document.querySelector('#setFunctionFormulaContent select'),
        firstRangeCell = document.querySelector('#setFunctionFormulaContent input:first-of-type'),
        secondRangeCell = document.querySelector('#setFunctionFormulaContent input:last-of-type'),
        sortStartRow = document.querySelector('#sortRows input:nth-of-type(1)'),
        sortEndRow = document.querySelector('#sortRows input:nth-of-type(2)'),
        sortCol = document.querySelector('#sortRows input:nth-of-type(3)'),
        sortAscendingButton = document.querySelector('#sortRows button:first-of-type'),
        sortDescendingButton = document.querySelector('#sortRows button:last-of-type'),
        arrowKeySelect = document.getElementsByName('arrowKeys')[0],
        arrowKeyUnselect = document.getElementsByName('arrowKeys')[1];

    // Needed for enabling and disabling buttons as a group.
    var allButtons = [destroyRowButton, destroyColButton, createRowButton, createColButton, submitFunctionButton];

    var arrowKeyHandlers = function(evt) {
        if (!activeCell) { return; }
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
    };

    // Keyboard navigation using 'Enter' and arrow keys.
    document.addEventListener('keydown', arrowKeyHandlers, false);

    // Add event handlers to arrow key radio button controls.
    arrowKeySelect.addEventListener('change', function() {
        document.addEventListener('keydown', arrowKeyHandlers, false);
        // De-focus the radio button so that a down arrow key press doesn't check the next radio button instead.
        nameBox.focus();
    }, false);

    arrowKeyUnselect.addEventListener('change', function() {
        document.removeEventListener('keydown', arrowKeyHandlers, false);
        nameBox.focus();
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

    // If a valid cell reference is present in the nameBox, makeActiveCell() is invoked for the referenced cell.
    // If the nameBox content isn't a valid cell reference, an error message is displayed in the messageBar.
    var selectNameBoxCell = function() {
        var result = grid.findCellObject(nameBox.value);
        if (typeof result === "object") {
            result.makeActiveCell();
        } else {
            setMessage(result);
        }
    };

    // This won't be detected while the arrowKeySelect() event handler is attached to the 'Enter' key, so the name box
    // button is also needed.
    nameBox.addEventListener('keypress', function(eventObject) {
        if (eventObject.keyCode !== 13) { return; }
        selectNameBoxCell();
    }, false);

    nameBoxButton.addEventListener('click', selectNameBoxCell, false);

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

    sortAscendingButton.addEventListener('click', function() { invokeSort(); }, false);
    sortDescendingButton.addEventListener('click', function() { invokeSort(true); }, false);

    var invokeSort = function(isDescending) {
        // Active cell's value must be submitted before sort begins.
        if (activeCell) { activeCell.removeActiveCellStatus(); }
        var sortReturnValue = grid.sortRows(sortCol.value, sortStartRow.value, sortEndRow.value, isDescending);
        // Error message will be returned if sort is unsuccessful.
        if (sortReturnValue) {
            setMessage(sortReturnValue);
        } else {
            // Reset message, so that a previous error message doesn't remain.
            setMessage();
        }
    };

    return {
        newActiveCell: newActiveCell,
        setMessage: setMessage, 
    };

}());
