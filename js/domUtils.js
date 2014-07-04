// Utility DOM methods.
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

};
