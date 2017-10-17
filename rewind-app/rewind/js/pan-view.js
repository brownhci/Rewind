
(function(parentScope) {
    'use strict';

    parentScope.panView =  function (options) {
    	var lat, lon;
    	var defaults = {
    		lat: 41.8303812,
    		lon: -71.3982521,
    	}


    	function _init() {
    		_.defaults(options, defaults);
    		createPan();
    	}


    	function createPan() {
    		lat = parseFloat(options.lat);
    		lon = parseFloat(options.lon);

    		var panorama = new google.maps.StreetViewPanorama(
            document.getElementById("pano"), {
              position: {lat: lat, lng: lon},
              linksControl: true,
              enableCloseButton: false,
              addressControl: false,
              clickToGo: false
        	});
    	};
    	_init();
    }
}('undefined' !== typeof __scope__ ? __scope__ : window));
