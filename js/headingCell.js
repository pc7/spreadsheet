/*
 * Generates and returns a heading cell object, and an associated DOM th object. The DOM object is appended to the argument tr object at the given index.
 */

var createHeadingCell = function(trObject, index) {

    "use strict";

    // >> Generating the cell. Happens once, when cell is instantiated.

    // Each heading cell has an associated th DOM object.
    // The th object contains an 'span' element, which contains the heading value.
    var thObject = document.createElement('th'),
        spanObject = document.createElement('span');

    thObject.appendChild(spanObject);
    domUtils.appendAtIndex(trObject, thObject, index);

    // >> End generating the cell.

    var destroy = function() {
        trObject.removeChild(thObject);
    };

    // Heading values are generated externally by the grid object.
    // They are generated whenever rows or columns are added to or removed from the grid.

    return {
        setHeadingValue: function(value) {spanObject.textContent = value;},
        destroy: destroy,
    };

};
