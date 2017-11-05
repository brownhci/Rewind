
// Modified from StreetviewSequence.js: https://github.com/UseAllFive/StreetviewSequence.js
// by Han Sha, 2017

/*globals $, _, Power0, google, TweenMax, __scope__, jQuery */

(function(parentScope) {
    'use strict';

    /**
     * Create a <code>StreetviewSequence</code> object.
     * @constructor
     * @param {string|jQuery} container The container to which the animation canvas will be appended.
     * @param {Object} options
     * @param {string} [options.domain] Scheme + host which to pass the query parameters. Useful when using a proxy to generate signed URLs for high resolution imagery.
     * @param {number} [options.duration=1] Duration of the animation.
     * @param {Ease} [options.easeHeading=Power0.easeIn] Greensock easing method used for heading skew.
     * @param {Ease} [options.easePitch=Power0.easeIn] Greensock easing method used for pitch skew.
     * @param {Ease} [options.easeRoute=Power0.easeIn] Greensock easing method used for route waypoint selection.
     * @param {number} [options.headingSkewEnd=options.headingSkewStart] Heading at which to end the animation (horizontal).
     * @param {number} [options.headingSkewStart=0] Heading at which to start the animation (horizontal).
     * @param {number} [options.height=150] (Intrinsic) height of the animation canvas in pixels.
     * @param {string} [options.key] Google API key.
     * @param {google.maps.LatLng} [options.location] Location at which to place the stationary panorama.
     * @param {boolean} [options.loop=false] Whether or not the animation should loop.
     * @param {number} [options.pitchSkewEnd=options.pitchSkewStart] Pitch at which to end the animation (vertical).
     * @param {number} [options.pitchSkewStart=0] Pitch at which to start the animation (vertical).
     * @param {google.maps.google.maps.DirectionsResult} [options.route] Maps directions result for route stepping.
     * @param {boolean} [options.sensor=false] Indicates whether or not the request came from a device using
     * a location sensor (e.g. a GPS) to determine the location sent in this request. This value must be either true or false.
     * @param {number} [options.totalFrames=75] Total number of frames to be used for animation.
     * @param {number} [options.width=300] (Intrinsic) height of the animation canvas in pixels.
     * @return {jQuery.Deferred.Promise}
     */
    parentScope.StreetviewSequence =  function (container, options) {
        var $canvas;
        var $container;
        var canvas;
        var ctx;
        var defaults = {
            duration: 1,
            easeHeading: Power0.easeIn,
            easePitch: Power0.easeIn,
            easeRoute: Power0.easeIn,
            headingSkewStart: 0,
            height: 150,
            loop: false,
            pitchSkewStart: 0,
            sensor: false,
            totalFrames: 75,
            width: 300
        };
        var headingCache = {};
        var images;
        var imagesLoadedCount;
        var publicMethods;
        var streetViewPanoramaDfd;
        var streetViewService;
        var tween;
        var totalRouteNo;
        var totalDuration;
        var curImg;
        var sliderVal;

        function _init() {
            _.defaults(options, defaults);
            $canvas = $('<canvas />');
            $container = (container instanceof jQuery) ? container : $(container);
            $container.append($canvas);
            canvas = $canvas.get(0);
            ctx = canvas.getContext('2d');
            images = [];
            imagesLoadedCount = 0;
            streetViewPanoramaDfd = $.Deferred();
            streetViewService = new google.maps.StreetViewService();
            totalRouteNo = options.route.length;
            totalDuration = totalRouteNo * options.totalFrames * 0.1;
            options.totalFrames = parseInt(50 / totalRouteNo);

            canvas.height = options.height;
            canvas.width = options.width;

            if ('undefined' === typeof options.headingSkewEnd) {
                options.headingSkewEnd = options.headingSkewStart;
            }

            if ('undefined' === typeof options.pitchSkewEnd) {
                options.pitchSkewEnd = options.pitchSkewStart;
            }

            tween = TweenMax.to(
                { currentTime: 0 },
                totalDuration,
                {
                    currentTime: totalDuration,
                    onComplete: ended,
                    onReverseComplete: ended,
                    onUpdate: draw,
                    paused: true
                }
            );

            loadImages();
        }

        /**
         * Calculate the current value of an ease based on it's progress
         * given a start and end point.
         * @param {number} p Raw linear progress of ease
         * @param {Ease} ease Ease function used for completion ratio calculation
         * @param {number} start Starting eased value
         * @param {number} end Ending eased value
         * @return {number}
         */
        function calcScalar(p, ease, start, end) {
            var delta;

            delta = end - start;

            return start + delta * ease.getRatio(p);
        }

        /**
         * Draw the current frame onto the animation canvas. Current frame is derived
         * from the animation progress and the total amount of frames.
         */
        function draw() {
            var p = tween.progress();
            console.log(p) /*EDITED OUT FOR NOW */
            //console.log(p);
            var idx = Math.round(p * (images.length - 1));
            images[idx].done(function (img) {
                curImg = img;
                ctx.drawImage(img, 0, 0);
            });

            updateSlider(idx, images.length);
        }


        function updateSlider(cur, length){
            sliderVal = cur / length;
            $("#slider").slider("value", sliderVal * 100);
        }


        function getCurLat() { 
             var curLat = $(curImg).attr("data-lat");           
             return curLat;         
        }

        function getCurLon() { 
             var curLon = $(curImg).attr("data-lon");           
             return curLon;         
        }

        /**
         * If <code>options.loop</code> is set to false, trigger an <code>ended</code>
         * event. If true, the animation is then reversed, and thus, loops.
         */
        function ended() {
            //console.log(images);
            if (!options.loop) {
                $canvas.trigger('ended');
                return;
            }

            if (tween.reversed()) {
                tween.restart();
            } else {
                tween.reverse();
            }
        }

        /**
         * As of Google Maps Javascript API V3 3.16, a literal lat/lng object and a <code>google.maps.LatLng</code> object
         * are accepted as location points. This facade makes this easier to manage.
         * @see https://developers.google.com/maps/documentation/javascript/3.exp/reference#LatLngLiteral
         * @param {Object|google.maps.LatLng} latLng google.maps.LatLng object or a literal lat/lng object.
         * @return {number}
         */
        function getLng(latLng) {
            return ('function' === typeof latLng.lng) ? latLng.lng() : latLng.lng;
        }

        /**
         * As of Google Maps Javascript API V3 3.16, a literal lat/lng object and a <code>google.maps.LatLng</code> object
         * are accepted as location points. This facade makes this easier to manage.
         * @see https://developers.google.com/maps/documentation/javascript/3.exp/reference#LatLngLiteral
         * @param {Object|google.maps.LatLng} latLng google.maps.LatLng object or a literal lat/lng object.
         * @return {number}
         */
        function getLat(latLng) {
            return ('function' === typeof latLng.lat) ? latLng.lat() : latLng.lat;
        }

        /**
         * Calculate an intermediary point between two given points and progress value
         * @param {number} t Progress value between two points (e.g 0.5 implies half-way)
         * @param {google.maps.LatLng} a Starting point 
         * @param {google.maps.LatLng} b End point
         * @return {google.maps.LatLng} Intermediary location
         */
        function pointOnLine(t, a, b) {
            function toRad(val) { return val * Math.PI / 180; };
            function toDeg(val) { return val * 180 / Math.PI; };

            var lat1 = toRad(a.lat()), lon1 = toRad(a.lng());
            var lat2 = toRad(b.lat()), lon2 = toRad(b.lng());

            var x = lat1 + t * (lat2 - lat1);
            var y = lon1 + t * (lon2 - lon1);

            return new google.maps.LatLng(toDeg(x), toDeg(y));
        };

        /**
         * For the given <code>options.location</code>, retrieve the necessary information to
         * build a Street View Image URL. Note that the only information used from the API request
         * is a <code>heading</code> that faces the street.
         * @return {jQuery.Deferred.Promise} Promise of a deferred object which eventually resolves with the necessary
         * information to generate a Street View Image API URL.
         */
        function getPanoramaData() {
            var key;

            key = options.location;
            if ('undefined' === typeof headingCache[key]) {
                headingCache[key] = getStreetHeading(options.location)
                    .then(function (heading) {
                        return {
                            location: options.location,
                            heading: heading,
                            pitch: 0
                        };
                    })
                ;
            }

            return headingCache[key];
        }

        /**
         * Retrieve the Street View Panorama information for a given point on the route based on the given
         * progress, <code>p</code>. From the Street View Panorama API response, we are given the original
         * panorama location, the proper heading (facing down the street), and the proper pitch (vertically centered).
         * @param {number} p Progress through the list of street view images.
         * @return {jQuery.Deferred.Promise} Promise of a deferred object which eventually resolves with the necessary
         * information to generate a Street View Image API URL.
         */
        function getRouteData(p, routeNo) {
            var location;
            var locationDfd;
            var panoResponseHandler;
            var pathIndex;
            var path, panoTime, panoLat, panoLon;

            path = options.route[routeNo].response.routes[0].overview_path;
            //console.log(options.route[routeNo]);
            panoTime = options.route[routeNo].timestamp;
            panoLat = options.route[routeNo].lat;
            panoLon = options.route[routeNo].lon;

            locationDfd = $.Deferred();
            pathIndex = calcScalar(p, options.easeRoute, 0, path.length - 1);
            
            var floorIndex = Math.floor(pathIndex); // 10.87 => 10
            var partial = pathIndex - floorIndex;   // 10.87 => 0.87
            var pointA = path[floorIndex];          // path[10]
            var pointB = path[floorIndex + 1];      // path[11]

            if (pointB) {
                location = pointOnLine(partial, pointA, pointB); // eqv: path[10.87]

            } else {
                location = pointA; // last point!
            }

            panoResponseHandler = function (result, status) {
                if (google.maps.StreetViewStatus.OK !== status) {
                    locationDfd.reject({
                        error: new Error('Unable to get location panorama'),
                        status: status
                    });
                    return;
                }

                locationDfd.resolve({
                    location: result.location.latLng,
                    heading: result.tiles.centerHeading,
                    pitch: result.tiles.originPitch,
                    timestamp: panoTime,
                    lat: panoLat,
                    lon: panoLon,
                    weather: "normal"
                });
            };

            streetViewService.getPanoramaByLocation(location, 50, panoResponseHandler);
            return locationDfd.promise();
        }

        /**
         * Get a street-facing heading for a given location accompanied with whether or not the location
         * is indoors.
         * @param {google.maps.LatLng} location
         * @return {jQuery.Deferred.Promise} Promise of a deferred object which eventually resolves with a heading and
         * a boolean value indicated whether or not the location is indoor.
         */
        function getStreetHeading(location) {
            var dfd = new $.Deferred();

            streetViewService.getPanoramaByLocation(location, 50, function (data, status) {
                if (google.maps.StreetViewStatus.OK !== status) {
                    dfd.reject({
                        error: new Error('StreetViewStatus is not OK'),
                        status: status
                    });
                    return;
                }

                if (0 === data.links.length) {
                    dfd.reject({
                        error: new Error('Nearby panorama not found')
                    });
                    return;
                }

                dfd.resolve(data.links[0].heading, '' === data.links[0].description);
            });

            return dfd.promise();
        }

        /**
         * Build a Street View Image API URL.
         * @param {object} options
         * @param {string} [options.domain=window.location.protocol + '//maps.googleapis.com'] Scheme + host which to pass the query parameters. Useful when using a proxy to generate signed URLs for high resolution imagery.
         * @param {number} options.height Image height in pixels.
         * @param {string} [options.key] Google Maps Javascript V3 API key.
         * @param {boolean} options.sensor Indicates whether or not the request came from a device using a location sensor (e.g. a GPS) to determine the location sent in this request. This value must be either true or false.
         * @param {number} options.width Image width in pixels.
         * @return {string} Street View Image API URL
         */
        function getStreetViewImageURL(options) {
            var PATH = '/maps/api/streetview';
            var domain;
            var parameters = {};
            var resource;

            domain = ('undefined' !== typeof options.domain) ? options.domain : window.location.protocol + '//maps.googleapis.com';

            if ('undefined' !== typeof options.key) {
                parameters.key = options.key;
            }
            parameters.sensor = options.sensor;
            parameters.size = options.width + 'x' + options.height;
            parameters.location = getLat(options.location) + ',' + getLng(options.location);
            if ('undefined' !== typeof options.heading) {
                parameters.heading = options.heading;
            }
            if ('undefined' !== typeof options.pitch) {
                parameters.pitch = options.pitch;
            }
            if ('undefined' !== typeof options.client) {
                parameters.client = options.client;
            }

            resource = domain + PATH + '?' + $.param(parameters);

            return resource;
        }

        /**
         * Increment the total count of loaded images, and notify the returned deferred
         * object of the total load progress. If the total loaded count is equal
         * to the total number of frames, the deferred object is resolved.
         * Every image used in the animation has its <code>onload</code>
         * event bound to this function.
         */
        function imageOnLoad() {
            imagesLoadedCount += 1;
            streetViewPanoramaDfd.notify(imagesLoadedCount / options.totalFrames);
            if (imagesLoadedCount === options.totalFrames * totalRouteNo) {
                streetViewPanoramaDfd.resolve(publicMethods);
            }
        }

        /**
         * Build the array of images used for animation.
         */
        function loadImages() {
            var i, j;
            var locationDataRetriever;
            var locationOnDataHandlerGenerator;
            var locationOnFailHandlerGenerator;
            var locationPromise;
            var p;

            locationOnDataHandlerGenerator = function (p) {
                return function (locationData) {
                    var currentLocationData = _.clone(locationData);
                    //console.log(locationData);
                    var image, timestamp;
                    var imageDfd = new $.Deferred();

                    //console.log(currentLocationData.heading);
                    currentLocationData.heading += calcScalar(p, options.easeHeading, options.headingSkewStart, options.headingSkewEnd);
                    //console.log(currentLocationData.heading);
                    currentLocationData.pitch += calcScalar(p, options.easePitch, options.pitchSkewStart, options.pitchSkewEnd);
                    currentLocationData.sensor = options.sensor;
                    currentLocationData.key = options.key;
                    currentLocationData.height = options.height;
                    currentLocationData.width = options.width;
                    currentLocationData.client = options.client;
                    currentLocationData.domain = options.domain;

                    timestamp = currentLocationData.timestamp;
                    var lon = getLng(currentLocationData.location);
                    var lat = getLat(currentLocationData.location);

                    image = new Image();
                    image.crossOrigin = "Anonymous";
                    image.onload = function () {
                        // Modification with Caman
                        window.modifyHyperlapseImages(this, timestamp, lat, lon, function(modImage) {
                            // console.log("Modded %", p * 100);
                            imageDfd.resolve(modImage);
                            imageOnLoad();
                        });
                    };
                    image.src = getStreetViewImageURL(currentLocationData);
                    return imageDfd.promise();
                };
            };

            locationOnFailHandlerGenerator = function () {
                return function () {
                    var imageDfd = new $.Deferred();
                    imageOnLoad();
                    imageDfd.resolve(new Image());
                    return imageDfd.promise();
                };
            };

            for (i = 0; i < options.route.length; i += 1){
            //console.log(options.route.length);

            for (j = 0; j < options.totalFrames; j += 1) {
                locationDataRetriever = ('undefined' === typeof options.route) ? getPanoramaData : getRouteData;
                p = (j / (options.totalFrames - 1));
                locationPromise = locationDataRetriever(p, i)
                    .then(locationOnDataHandlerGenerator(p), locationOnFailHandlerGenerator(p))
                    .then(function(img) { return img; })
                ;
                images.push(locationPromise);
                }
            }
            //console.log(images.length)
        }


        /**
         * Pause the animation.
         */
        function pause() {
            tween.pause();
        }

        /**
         * Play the animation.
         */
        function play() {
            tween.play();
        }

        /**
         * Set the animation progress
         */
        function setProgress(p) {
            tween.pause();
            tween.progress(p);
        }

        /**
         * Get Slider progress.
         */
         function getProgress() {
            return sliderVal;
         }

        _init();

        //-- Expose:
        publicMethods = {
            getStreetHeading: getStreetHeading,
            getStreetViewImageURL: getStreetViewImageURL,
            pause: pause,
            play: play,
            setProgress: setProgress,
            getLat: getCurLat,
            getLon: getCurLon,
            getProgress: getProgress,
        };

        return streetViewPanoramaDfd.promise();
    };
}('undefined' !== typeof __scope__ ? __scope__ : window));