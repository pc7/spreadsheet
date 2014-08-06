// Utility DOM methods.
// Written by P Cope.
var domUtils = {

    // Appends a child element to a parent element at a given index.
    appendAtIndex: function(parentEl, childEl, index) {

        // If index isn't given, append child element as the last child.
        index = (index === undefined) ? parentEl.children.length : index;

        if (index !== parentEl.children.length) {
            parentEl.insertBefore(childEl, parentEl.children[index]);
        } else {
            parentEl.appendChild(childEl);
        }

    },

    // Returns a child element of a given type, that is the nth child using a zero-based index.
    // The child element type is the HTML element's string name, eg 'td', 'div'.
    getNthChildOfType: function(parentEl, childElType, index) {
        return parentEl.querySelector( childElType + ':nth-of-type(' + (index+1) +')' );
    },

};
