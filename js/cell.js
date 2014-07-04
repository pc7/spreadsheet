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

    return {

    };


};
