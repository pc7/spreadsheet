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

    // This is the cell object that will be returned.
    // Needs to be explicitly referred to in an event handler, so needs an identifier.
    var cellObject = {};


    // Gives the cell active cell status. Active cell status is indicated by the tdObject having the '#activeCell' id.
    var makeActiveCell = function() {

        // Need to explicitly focus the input element, as activeCell status can be given using the nameBox, rather than just clicking the cell.
        inputEl.focus();

        tdObject.setAttribute('id', 'activeCell');
        menu.newActiveCell(cellObject);
    };

    var removeActiveCellStatus = function() {
        tdObject.removeAttribute('id');
    };

    tdObject.addEventListener('click', function() {
        // Make the cell the active cell, if it isn't already.
        if (!tdObject.getAttribute('id', 'activeCell')) {
            // This is the method invokation which requires the cell object to have an identifier.
            makeActiveCell();
        }
    }, false);

    // Public methods.
    cellObject.makeActiveCell = makeActiveCell;
    cellObject.removeActiveCellStatus = removeActiveCellStatus;

    return cellObject;

};
