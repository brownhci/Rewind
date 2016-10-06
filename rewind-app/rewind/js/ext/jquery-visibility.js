// From: http://stackoverflow.com/questions/9614622/equivalent-of-jquery-hide-to-set-visibility-hidden

jQuery.fn.visible = function() {
    return this.css('visibility', 'visible');
};

jQuery.fn.invisible = function() {
    return this.css('visibility', 'hidden');
};
