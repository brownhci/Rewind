$(function() {
	TIMEZONE_API = "https://maps.googleapis.com/maps/api/timezone/json?location={{LAT}},{{LON}}&timestamp={{MILLIS}}";
    REWIND_HOST = "localhost:8080";

	// For northern hemisphere only!
	MONTH_SATURATION = {
		"12": -40,
		"01": -40,
		"02": -40,

		"03": 10,
		"04": 10,
		"05": 10,

		"06": 40,
		"07": 40,
		"08": 40,

		"09": -10,
		"10": -10,
		"11": -10,
	};

    function createHyperlapse(locations, pano) {
        var panoWidth = 600;
        var panoHeight = 600;

        $(pano).html("<img src='img/loading.gif' style='width:50px; margin:275px 275px'></img>");

        if (locations.length < 2) {
            alert("too few location points (count: " + locations.length + ") for the day");
            return;
        }

        var hyperlapse = new Hyperlapse(pano, {
            //lookat: new google.maps.LatLng(41.842085, -71.394373),//(37.81409525128964,-122.4775045005249),
            zoom: 2,
            use_lookat: false,
            elevation: 50,
            width: panoWidth,
            height: panoHeight,
            millis: 1000 / 24,
            distance_between_points: 1,
            max_points: 300
        });

        hyperlapse.onError = function(e) {
            console.log(e);
        };

        hyperlapse.onRouteComplete = function(e) {
            hyperlapse.load();
        };

        hyperlapse.onLoadComplete = function(e) {
            
            hyperlapse.pause();
            var hyperlapsePoints = hyperlapse.getPoints();
            var processedPoints = 0;
            _.each(hyperlapsePoints, function(point, i, points) {
                window.modifyHyperlapseImages(point.image, function() {
                    processedPoints++;
                    console.log("Processed:", processedPoints, "off", points.length);
                    if (processedPoints == points.length) {
                        $(pano).find("img").hide();
                        $(pano).find("canvas").show();
                        $(pano).show();
                        $(pano.parentNode).find('.location').hide();
                        $(pano.parentNode).find('.loading-gif').hide();
                        hyperlapse.play();
                    }
                });
            });
            
            //when cursor is on rew\ind video
            $(pano).on("mousemove", function(event) {
                var mouseX = parseInt(event.pageX - parseInt($(pano).offset().left));
                var mouseY = parseInt(event.pageY - parseInt($(pano).offset().top));
                // console.log( "pageX: " + mouseX + ", pageY: " + mouseY );
                var imagePos = parseInt(mouseX * (hyperlapse.getPositionCount() - 1) / panoWidth);
                console.log(imagePos);
                hyperlapse.setPosition(imagePos);
            });
        };

        var routes = sliceLocationsToRoutes(locations);
        var gResults = [];

        for (var i = 0; i < routes.length; i++) {
            getGoogleRoute(routes, gResults, i, function() {
                hyperlapse.generate({
                    route: mergeGoogleResponses(gResults)
                });
            });
        }

    }

    function mergeGoogleResponses(googleResponses) {
        var firstResponse = googleResponses.shift();

        var newPath = firstResponse.routes[0].overview_path;
        var newLegs = firstResponse.routes[0].legs;

        _.each(googleResponses, function(resp) {
            var path = resp.routes[0].overview_path;
            var legs = resp.routes[0].legs;

            newPath = newPath.concat(path);
            newLegs = newLegs.concat(legs);
        });

        firstResponse.routes[0].overview_path = newPath;
        firstResponse.routes[0].legs = newLegs;

        return firstResponse;
    }

    function getGoogleRoute(routes, results, i, onFinished) {
        var locations = routes[i];

        var first = locations.shift()
        var last = locations.pop()

        // Google Maps API stuff here...
        var directions_service = new google.maps.DirectionsService();

        var route = {
            request: {
                origin: googleLatLng(first),
                destination: googleLatLng(last),
                waypoints: _(locations).map(function(location) {
                    return {
                        location: googleLatLng(location)
                    };
                }),
                travelMode: google.maps.DirectionsTravelMode.DRIVING
            }
        };

        directions_service.route(route.request, function(response, status) {
            if (status == google.maps.DirectionsStatus.OK) {
                //hyperlapse.generate( {route:response} );
                results[i] = response;

                if (_.compact(results).length == routes.length) {
                    onFinished();
                }
            } else {
                console.log(status);
            }
        });
    }

    function sliceLocationsToRoutes(locations) {
        var routeMax = 10;
        var locs = [];
        var routes = [];

        while (locations.length > 0) {
            var loc = locations.shift();
            locs.push(loc);

            if (locs.length == routeMax || locations.length == 0) {
                routes.push(locs);
                locs = [loc];
            }
        }

        return routes;

    }

    function googleLatLng(location) {
        return new google.maps.LatLng(location.latitude, location.longitude);
    }

    // inspired from StackOverflow: http://stackoverflow.com/a/13763063/1246009
    function getImageLightness(image) {
        // create canvas
        var canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);

        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;
        var colorSum = 0, saturSum = 0;

        for (var x = 0, len = data.length; x < len; x += 4) {
            var r = data[x] / 256;
            var g = data[x + 1] / 256;
            var b = data[x + 2] / 256;

            colorSum += (r + g + b) / 3;

            var cmin = Math.min(r, g, b);
            var cmax = Math.max(r, g, b);
            var cdelta = cmax - cmin;

            saturSum += (cmax != 0 ? cdelta / cmax : 0);
        }

        var brightness = colorSum / (image.width * image.height);
        var saturation = saturSum / (image.width * image.height);
        return [brightness, saturation];
    }

    var dragArea = document.getElementById('file-drop-area');
    dragArea.ondragover = function () { this.className = 'dragging'; return false; };
    dragArea.ondragend = dragArea.ondragleave = function () { this.className = ''; return false; };
    dragArea.ondrop = function (e) {
        this.className = '';
        e.preventDefault();
        handleUploadedFile(e.dataTransfer.files[0]);
    }

    var fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        handleUploadedFile(fileInput.files[0]);
    });

    function handleUploadedFile(file) {
        $("#upload-wrapper").html("<img src='img/loading.gif' style='width:50px; margin: 20px 275px'></img>");

        var reader = new FileReader();

        reader.readAsText(file);
        reader.addEventListener('load', function(e) {
            processLocationExport(reader.result);
        });
    }

    function isWinter(month, lat) {
        var absLat = Math.abs(parseInt(lat));

        return (_.contains(["12", "01", "02"], month) || absLat > 60) && absLat > 15;
    }

    function isSummer(month, lat) {
        var absLat = Math.abs(parseInt(lat));

        return (_.contains(["06", "07", "08"], month) || absLat < 15) && absLat < 60;
    }

    function isSpring(month, lat) {
        var absLat = Math.abs(parseInt(lat));

        return _.contains(["03", "04", "05"], month);
    }

    function isFall(month, lat) {
        var absLat = Math.abs(parseInt(lat));

        return _.contains(["09", "10", "11"], month);
    }

    var locationsByDate = null;

    var timeZoneUrlTpl = "https://maps.googleapis.com/maps/api/timezone/json?location={{LAT}},{{LON}}&timestamp={{MILLIS}}";

    var timezoneJSONs = {};
    function getTimezoneJSON(url, callback) {
        if (timezoneJSONs[url]) { 
            callback(timezoneJSONs[url]);
        } else {
            $.getJSON(url, function(data) {
                timezoneJSONs[url] = data;
                callback(data);
            });
        }
    }

    function manipulateImage(image, millis, lat, lon, callback) {
        var datetime = moment(parseInt(millis));
        var hour = datetime.utc().hour();
        var timeZoneUrl = timeZoneUrlTpl
                .replace("{{LAT}}", lat)
                .replace("{{LON}}", lon)
                .replace("{{MILLIS}}", millis.replace(/\d\d\d$/,""));

        // var exposure = hour > 12 ? -60 : 40;

        console.log("Manipulating:", image);

        var month = getMonth(datetime.format("MM/DD/YYYY"));
        // var saturation = MONTH_SATURATION[month];
        
        getTimezoneJSON(timeZoneUrl, function(data) {
            var hourOffset = data.rawOffset / 60 / 60;
            var localHour = ( hour + hourOffset + 24 ) % 24;

            console.log("Received location data for:", image);

            var res = getImageLightness(image);
            var avgBrightness = res[0];
            var avgSaturation = res[1];

            var saturation = 0;
            var exposure = 0;

            if (localHour > 16 && localHour <= 19 && avgBrightness > 0.5) {
                exposure = -20;
            } else if ((localHour > 19 || localHour <= 6) && avgBrightness > 0.3) {
                exposure = -40;
            } else if (localHour > 6 && localHour <= 12 && avgBrightness <= 0.5) {
                exposure = 40;
            } else if (localHour > 12 && localHour <= 16 && avgBrightness <= 0.3) {
                exposure = 20;
            }

            if (isWinter(month, lat) && avgSaturation > 0.10) {
                saturation = -40;
            } else if (isSpring(month, lat) && avgSaturation > 0.30) {
                saturation = -20;
            } else if (isSpring(month, lat) && avgSaturation < 0.20) {
                saturation = 20;
            } else if (isSummer(month, lat) && avgSaturation < 0.30) {
                saturation = 40;
            } else if (isFall(month, lat) && avgSaturation > 0.20) {
                saturation = -20;
            } else if (isFall(month, lat) && avgSaturation < 0.10) {
                saturation = 20;
            }

            if (parseInt(lat) < 0) {
                saturation *= -1;
            }

            // if (callback) {
            //     saturation = -80;
            //     exposure = 40;
            // }

            var parent = image.parentNode; 
            if (!parent) {
                parent = document.createElement("div");
                parent.appendChild(image);
            }

            // log data on image attributes
            $(image).attr("data-saturation", saturation);
            $(image).attr("data-exposure", exposure);
            $(image).attr("data-hour", hour);
            $(image).attr("data-localHour", localHour);
            
            Caman(image, function() {
                this.saturation(saturation);
                this.exposure(exposure);
                this.render(function() {
                    if (callback)  {
                        callback(parent.childNodes[0]);
                    }
                });
            });
        });
    }

    function getRandomLocations(trips, count) {
        var randLocations = [];
        var i = 0;
        while (i < count) {
            var trip = Math.floor(Math.random() * trips.length);
            var tripLocations = trips[trip];

            if (tripLocations.length > 2) {
                var location = tripLocations[Math.floor(Math.random() * tripLocations.length)];
                randLocations.push({
                    trip: trip,
                    location: location
                });
                i++;
            }
        }
        return randLocations;
    }

    function getMonth(dateString) {
    	return dateString.split("/")[0];
    }

    function processLocationExport(fileContents) {
        locations = parseLocationJson(fileContents);

        $("#upload-wrapper").hide();

        locations.reverse();

        var locationsCsvLines = _.map(locations, function(location) {
            return location.latitude + "," + location.longitude + "," + location.millis + "\r\n";
        });

        var webSocket = new WebSocket("ws://" + REWIND_HOST + "/Rewind/Endpoint");
        
        webSocket.onopen = function(event){
            // webSocket.send(inversedBatch);
            while (locationsCsvLines.length > 0) {
                var removed = locationsCsvLines.splice(0, 50);
                var csvPartial = _.reduce(removed, function(memo, line) { return memo + line; }, "");
                webSocket.send(csvPartial);
            }
            webSocket.send("\r\n");
        };

        webSocket.onmessage = function(event){
            handleServerResponse(event.data);
        };

        webSocket.onclose = function(event){
            console.log("Server connection is closed!")
        };
    }

    var trips = [];
    function handleServerResponse(response) {
        // DO SOMETHING WITH THE RESPONSE
        if (response !== "\r\n")
            trips.push(parseLocationCsv(response));
        else
            generateRewindSurvey(trips);
    }

    function parseLocationsCsv(csv) {
        var lines = csv.split(/\r?\n/);
        var results = [];

        lines.forEach(function(line, i) {
            var parts = line.split(",");

            var lat    = parseFloat(parts[0]);
            var lon    = parseFloat(parts[1]);
            var timeMs = parseInt(parts[2]);

            results.push({
                latitude: lat,
                longitude: lon,
                millis: timeMs
            });
        });

        return results;
    }

    function generateRewindSurvey(trips) {
        var imageIndex = 0;
        var imageCount = 10;
        var locations = getRandomLocations(trips, imageCount);
        //var urls = generateStreetViewUrls(locations, false);
        var flatLocations = _.pluck(locations, "location");

        // making this true filters the flatLocations array, filtering similar locations. 
        // Cannot match dates with locations in this case. urls does not match flatLocations.
        var urls = generateStreetViewUrls(flatLocations, false);

        var questionsHtml = "";

        var questionHtmlTpl = "" +
            "<div class='location-questions' id='q{{INDEX}}'>" +
            "<div class='image-pano' style='position:relative'>" +
                "<img class='location' crossorigin='anonymous' src='{{SRC}}' data-trip='{{TRIP}}' data-millis='{{MILLIS}}' data-lat='{{LAT}}' data-lon='{{LON}}' style='width:600px; height:600px;'></img>" +
                "<img class='play-icon' src='img/play.png' style='position:absolute; top:0px; left:0px; width:100px; margin:250px 250px;'>"+
                "<img class='loading-gif' src='img/loading.gif' style='position:absolute; top:0px; left:0px; width:100px; margin:250px 250px;'></img>"+
                "<div class='hyperlapse' style='display:none'></div>" +
            "</div>" +
            "<ol>" +
            "<li class='question'>" +
            "<div class='qtext'> Do you remember this place?</div>" +
            "<div class='qanswers'>" +
            "<input type='radio' name='q{{INDEX}}ans1' value='true'></input><span class='ans-label'> Yes</span>" +
            "<input type='radio' name='q{{INDEX}}ans1' value='false'></input><span class='ans-label'> No</span>" +
            "</div>" +
            "</li>" +
            // "<li class='question'>" +
            //  "<div class='qtext'> Is this an important place to you?</div>" +
            //  "<div class='qanswers'>" +
            //      "<input type='radio' name='q{{INDEX}}ans2' value='true'></input><span class='ans-label'> Yes</span>" +
            //      "<input type='radio' name='q{{INDEX}}ans2' value='false'></input><span class='ans-label'> No</span>" +
            //  "</div>" +
            // "</li>" +
            "<li class='question'>" +
            "<div class='qtext'> Do you want to keep this picture?</div>" +
            "<div class='qanswers'>" +
            "<input type='radio' name='q{{INDEX}}ans3' value='true'></input><span class='ans-label'> Yes</span>" +
            "<input type='radio' name='q{{INDEX}}ans3' value='false'></input><span class='ans-label'> No</span>" +
            "</div>" +
            "</li>" +
            "<li class='question' style='display:none'>" +
            "<div class='qtext'> Were you traveling alone?</div>" +
            "<div class='qanswers'>" +
            "<input type='radio' name='q{{INDEX}}ans4' value='true'></input><span class='ans-label'> Yes</span>" +
            "<input type='radio' name='q{{INDEX}}ans4' value='false'></input><span class='ans-label'> No</span>" +
            "</div>" +
            "</li>" +
            "</ol>" +
            "<div style='clear: both;''></div>" +
            "</div>";


        urls.forEach(function(url, i) {
            var questionHtml = questionHtmlTpl
                .replace("{{SRC}}", url)
                .replace(/{{INDEX}}/g, i)
                .replace("{{TRIP}}", locations[i].trip)
                .replace("{{LAT}}", locations[i].location.latitude)
                .replace("{{LON}}", locations[i].location.longitude)
                .replace("{{MILLIS}}", locations[i].location.millis);

            questionsHtml += questionHtml;
        });


        var $resDiv = $("#question-list");
        $resDiv.html(questionsHtml);

        $(".image-pano > img.location").each(function() {
            var millis = $(this).attr("data-millis");
            var lat = $(this).attr("data-lat");
            var lon = $(this).attr("data-lon");

            this.onload = function() {
                manipulateImage(this, millis, lat, lon);
            };
        });

        $(".image-pano").click(function() {
            $(this).addClass("loading-hyperlapse");
            var $img = $(this).find(".location")
            var locations = trips[parseInt($img.attr("data-trip"))];

            var millis = $img.attr("data-millis");
            var lat = $img.attr("data-lat");
            var lon = $img.attr("data-lon");

            // $img.hide();
            $img.nextAll(".play-icon").hide();
            // $img.nextAll(".hyperlapse").show();

            window.modifyHyperlapseImages = function(image, callback) {
                manipulateImage(image, millis, lat, lon, callback);
            };

            createHyperlapse(locations, $img.nextAll(".hyperlapse")[0]);
        });

        $(".location-questions > ol > li:first-child input").change(function() {
            if (this.value == "true") {
                $(this.parentNode.parentNode.parentNode).find("li").show();
            }
        });

        $(".location-questions > ol > li input").change(function() {
            $(this.parentNode).find("span.ans-label").css({
                color: ""
            });

            if (this.checked == true) {
                $(this).next().css({
                    fontWeight: "bold",
                    color: "#7acaff"
                });
            }
        });

        $(".location-questions").each(function() {
            $(this).hide();
        });

        $("#q0").show();
        $("#nextButton").visible();

        $("#submitButton").click(function() {
            var questions = $(".location-questions");
            var answers = [];

            questions.each(function(i, locQuestion) {
                var url = $(locQuestion).find("img").attr("src");
                var questions = $(locQuestion).find(".question");

                var answer = {
                    "url": url,
                    "q1": $(questions[0]).find("input:checked").attr("value") || null,
                    "q2": $(questions[1]).find("input:checked").attr("value") || null,
                    "q3": $(questions[2]).find("input:checked").attr("value") || null,
                };

                answers.push(answer);
            });

            console.log(answers);

            yesCounter = 0;
            answers.forEach(function(answer) {
                if (answer["q1"] == "true")
                    yesCounter++;
            });
            alert("You remember " + yesCounter + " our of " + answers.length + " places");
        });
        $("#nextButton").click(function() {
            $("div.hyperlapse").hide().find("*").remove();
            $("img.location").show();


            $("#submitButton").visible();
            $("#backButton").visible();
            if (imageIndex < urls.length - 1) {
                $("#q" + imageIndex).hide();
                imageIndex++;
            }
            if (imageIndex == urls.length - 1) {
                $("#nextButton").invisible();
            }
            $("#q" + imageIndex).show();
            console.log("Showing: #q" + imageIndex + " imageIndex: " + imageIndex + " imageCount: " + urls.length);
        });
        $("#backButton").click(function() {
            $("div.hyperlapse > *").remove();

            $("#nextButton").visible();
            $("#submitButton").visible();
            if (imageIndex > 0) {
                imageIndex--;
            }
            if (imageIndex == 0) {
                $("#backButton").invisible();
            }
            $("#q" + (imageIndex + 1)).hide();
            $("#q" + imageIndex).show();
            console.log("Showing: #q" + imageIndex + " imageIndex: " + imageIndex + " imageCount: " + urls.length);

        });
    }

    function getLocationsOnDate(date) {
        var locationHtml = "";

        var locations = locationsByDate[date];
        locations.sort(function(a, b) {
            return a.millis - b.millis;
        });

        var uniqLocations = []
        var uniq = {}

        locations.forEach(function(location, i) {
            var date = location.millis;
            // always get up to the first 7 digits after decimal
            var lat = ("" + location.latitude).match(/^(.+\.\d{1,7})/)[1];
            var lon = ("" + location.longitude).match(/^(.+\.\d{1,7})/)[1];


            // location unique to 3 digits after decimal point
            var latSig = ("" + lat).match(/^(.+\.\d{1,3})/)[1];
            var lonSig = ("" + lon).match(/^(.+\.\d{1,3})/)[1];
            var key = latSig + "_" + lonSig;

            if (uniq[key]) {
                return;
            } else {
                uniq[key] = true;
            }

            //locationHtml += "Date:" + moment(date).format("MM/DD/YYYY H:mm:ss") + " Lat:" + lat + " Lon:" + lon + "\n";
            uniqLocations.push(location);
        });


        //$("#urlList").html("<pre>"+locationHtml+"</pre>")
        return uniqLocations;
    }

    function generateStreetViewUrls(locations, uniq) {
        var urls = [];
        var uniq = {}

        locations.forEach(function(location, i) {
            // always get up to the first 7 digits after decimal
            var lat = ("" + location.latitude).match(/^(.+\.\d{1,7})/)[1];
            var lon = ("" + location.longitude).match(/^(.+\.\d{1,7})/)[1];

            if (uniq) {
                // location unique to 3 digits after decimal point
                var latSig = ("" + lat).match(/^(.+\.\d{1,3})/)[1];
                var lonSig = ("" + lon).match(/^(.+\.\d{1,3})/)[1];
                var key = latSig + "_" + lonSig;

                if (uniq[key]) {
                    return;
                } else {
                    uniq[key] = true;
                }
            }

            var streetViewUrl = "https://maps.googleapis.com/maps/api/streetview?size=600x600&location=" + lat + "," + lon + "&fov=90&heading=270&pitch=10";
            urls.push(streetViewUrl);

            if (Math.random() > 0.99) console.log("Gen URLs: " + i / locations.length * 100 + "%");
        });

        return urls;
    }

    function parseLocationJson(locJson) {
        var obj = JSON.parse(locJson);
        var results = [];

        obj.locations.forEach(function(location, i) {
            if (i % 1000 == 0) {
                console.log("Parsing: " + i + "/" + obj.locations.length);
            }

            if (location.accuracy > 10) return;

            var lat = location.latitudeE7 * 0.0000001;
            var lon = location.longitudeE7 * 0.0000001;
            var timeMs = parseInt(location.timestampMs);
            //console.log("Latitude: " + lat + "    Longitude: " + lon);

            results.push({
                latitude: lat,
                longitude: lon,
                millis: timeMs
            });
        });

        return results;
    };

});
