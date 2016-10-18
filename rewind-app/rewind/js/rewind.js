$(function() {
    var Caman = require('caman');
    var animate;

    var API_KEY = 'AIzaSyC_GSlJw9b4ns8AHndV-EMp-kCA35ZAvSE';
   
    TIMEZONE_API = "https://maps.googleapis.com/maps/api/timezone/json?key=" + API_KEY + "&location={{LAT}},{{LON}}&timestamp={{MILLIS}}";

    var ambiance = null;
    var panoWidth  = 640;
    var panoHeight = 640;
    var directions_service;

    
    function createHyperlapse(locations, pano) {
        $(pano).html("<img src='img/loading.gif' style='width:50px; margin:275px 275px'></img>");
        if (locations.length < 2) {
            alert("too few location points (count: " + locations.length + ")");
            return;
        }else{
                //show play button only when there are enough data points for creating the hyperlapse
                $(".play-icon").hide();
                $("#playButton").html("Loading Rewind...");
                $("#playButton").css("background-color", "white");
                $("#playButton").css("color", "#009aff");
                $("#playButton").visible();
        }

        var routes = sliceLocationsToRoutes(locations);
        var gResults = [];
        for (var i = 0; i < routes.length; i++) {
            getGoogleRoute(routes, gResults, i, function() {
                var routeSequence = StreetviewSequence($(pano), {
                    route: mergeGoogleResponses(gResults),
                    duration: 10000,
                    totalFrames: 200, 
                    loop: true,
                    width: panoWidth,
                    height: panoHeight,
                    domain: 'http://maps.googleapis.com',
                    key: API_KEY,
                });

                routeSequence.done(function(player) {
                    $("#playButton").html("Play Rewind");
                    $("#playButton").css("background-color", "#009aff");
                    $("#playButton").css("color", "white");
                    
                    $("#playButton").click(function() {
                        $(pano).find("img").hide();
                        $(pano).find("canvas").show();
                        $(pano).show();
                        $(pano.parentNode).find('.location').hide();
                        player.play();
                    });

                    // ambiance = new Audio("./audio/thunder.mp3");
                    // ambiance.play();

                    //when cursor is on rewind video
                    $('#question-list').on("mousemove", function(event) {
                        var mouseX = parseInt(event.pageX - parseInt($(pano).offset().left));
                        var mouseY = parseInt(event.pageY - parseInt($(pano).offset().top));
                        renderPrec('snow');
                        // console.log( "pageX: " + mouseX + ", pageY: " + mouseY );
                        var imagePos = mouseX / panoWidth;
                        //console.log("Frame progress:", imagePos);
                        player.setProgress(imagePos);
                    });
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
        var first = locations.shift();
        var last = locations.pop();
        
        directions_service = new google.maps.DirectionsService();

        var routeRequest = {
            origin: googleLatLng(first),
            destination: googleLatLng(last),
            waypoints: _(locations).map(function(location) {
                return {
                    location: googleLatLng(location)
                };
            }),
            travelMode: google.maps.DirectionsTravelMode.WALKING
        };

        getRouteFromDirectionsService(routeRequest, 10, function(err, response) {
            if (err) {
                throw Error("Direction Service request failed for: " + JSON.stringify(err));
            }

            results[i] = response;

            if (_.compact(results).length == routes.length) {
                onFinished();
            }
        });
    }

    function getRouteFromDirectionsService(request, tries, callback) {
        setTimeout(function() { 
            directions_service.route(request, function(response, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                    callback(null, response);
                } else if (tries > 0) {
                    console.log('retrying with ' + tries + ' left');
                    getRouteFromDirectionsService(request, tries - 1, callback); 
                } else {
                    callback(status, null);
                }
            });            
        }, Math.random() * 10000);
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
        //console.log(routes);
        return routes;
    }

    function googleLatLng(location) {
        return new google.maps.LatLng(location.latitude, location.longitude);
    }

    // inspired from StackOverflow: http://stackoverflow.com/a/13763063/1246009
    function getImageLightnessSampled(image) {
        // constants
        var sampleCount = 10000; // number of samples
        
        var canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);

        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;
        var colorSum = 0, saturSum = 0;

        for (var i = 0; i < sampleCount; i++) {
            var randX = Math.floor(Math.random() * canvas.width);
            var randY = Math.floor(Math.random() * canvas.height);

            var x = (randY * canvas.width) + randX;

            var r = data[x] / 256;
            var g = data[x + 1] / 256;
            var b = data[x + 2] / 256;

            colorSum += (r + g + b) / 3;

            var cmin = Math.min(r, g, b);
            var cmax = Math.max(r, g, b);
            var cdelta = cmax - cmin;

            saturSum += (cmax != 0 ? cdelta / cmax : 0);
        }

        var brightness = colorSum / sampleCount;
        var saturation = saturSum / sampleCount;
        return [brightness, saturation];
    }

    function getImageLightnessFull(image) {
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

        // return [0.5, 0.5];
    }

    //process uploaded google location data
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
            pullRoutesfromLocs(reader.result);
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
        //console.log(month)
        var absLat = Math.abs(parseInt(lat));
    
        return _.contains(["03", "04", "05"], month);
    }

    function isFall(month, lat) {
        var absLat = Math.abs(parseInt(lat));
   
        return _.contains(["09", "10", "11"], month);
    }

    var locationsByDate = null;

    var timeZoneUrlTpl = "https://maps.googleapis.com/maps/api/timezone/json?key=" + API_KEY + "location={{LAT}},{{LON}}&timestamp={{MILLIS}}";
    //console.log(timeZoneUrlTpl);
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


    function manipulateImage(image, millis, lat, lon, id, callback) {
        var datetime = moment(parseInt(millis));
        var hour = datetime.utc().hour().toString();
        hour = hour.length > 1 ? hour: "0" + hour;
        var minute = datetime.utc().minute().toString();
        minute = minute.length > 1 ? minute : "0" + minute
        var timeZoneUrl = timeZoneUrlTpl
                .replace("{{LAT}}", lat)
                .replace("{{LON}}", lon)
                .replace("{{MILLIS}}", millis.replace(/\d\d\d$/,""));

        var month = getMonth(datetime.format("YYYY-MM-DD"));
        var _date = getDate(datetime.format("YYYY-MM-DD"));

        // TODO : account for some hours that are skipped in data
        var re = new RegExp(datetime.format('YYYYMMDDHH')+'[^,]{16}');
        var date = month.replace(/-/g, "")
        var myurl = "http://localhost:8000/weather/" + lat +"/" + lon + "/"+ millis;


        var contrast = 0;
        if (Math.floor(lat)==41 && Math.floor(lon)==-71 && precip > 0) {
            contrast = -15;
        } else {
            contrast = 10;
        }
        
        getTimezoneJSON(timeZoneUrl, function(data) {
            var hourOffset = data.rawOffset / 60 / 60;
            var localHour = ( hour + hourOffset + 24 ) % 24;

            // console.log("Received location data for:", image);

            var res = getImageLightnessSampled(image);
            //console.log(res)
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


            var parent = image.parentNode; 
            if (!parent) {
                parent = document.createElement("div");
                parent.appendChild(image);
            }
            //console.log(image);

            // log data on image attributes
            getWeather(myurl, function(weather){

                $(image).attr("data-weather", weather);
                $(image).attr("data-saturation", saturation);
                $(image).attr("data-exposure", exposure);
                $(image).attr("data-contrast", contrast);
                $(image).attr("data-hour", hour);
                $(image).attr("data-localHour", localHour);
                $(image).attr('data-id', id);

                if (id == 'pano0'){
                    switch(weather){
                        case 'rain':
                            $('#rainLayer').show();
                            break;
                        case 'snow':
                            $('#snowLayer').show();
                            break;
                    }
                }

                Caman.fromImage(image).then(function(caman) {
                    caman.attach(image);

                    var newImage = parent.childNodes[0];
                    var season;
                    if (isWinter(month, lat)){
                        season = "winter";
                    }else if (isSpring(month, lat)){
                        season = "spring";
                    }else if (isSummer(month, lat)){
                        season = "summer";
                    }else{
                        season = "fall";
                    }

                    // copy image attributes to canvas attributes
                    $(newImage).attr("class", $(image).attr("class"));
                    $(newImage).attr("data-date", $(image).attr("data-date"));
                    $(newImage).attr("data-millis", $(image).attr("data-millis"));
                    $(newImage).attr("data-lat", $(image).attr("data-lat"));
                    $(newImage).attr("data-lon", $(image).attr("data-lon"));
                    $(newImage).attr("data-saturation", $(image).attr("data-saturation"));
                    $(newImage).attr("data-exposure", $(image).attr("data-exposure"));
                    $(newImage).attr("data-hour", $(image).attr("data-hour"));
                    $(newImage).attr("data-localHour", $(image).attr("data-localHour"));
                    $(newImage).attr("data-weather", $(image).attr("data-weather"));
                    return caman.pipeline(function () {
                        this.saturation(saturation);
                        this.exposure(exposure);
                        this.contrast(contrast);
                        if (weather != 'normal' && hour < 12) this.vibrance(-100);//this.contrast(100); this.sepia(100); 
                    }).then(function () {
                        //console.log(typeof(parent.childNodes[0]));
                        changeHues (parent.childNodes[0], weather, season, hour);
                        if (callback) callback(parent.childNodes[0]);
                        
                    });
                });
            });
        });
    }

    function getMonth(dateString) {
        return dateString.split("-")[1];
    }

    function getDate(dateString) {
        return dateString.split("-")[2];
    }

    // Haversine formula for coordinate distance calculation
    // From: http://stackoverflow.com/a/27943
    function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
        function deg2rad(deg) {
            return deg * (Math.PI/180)
        }

        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2-lat1);  // deg2rad below
        var dLon = deg2rad(lon2-lon1); 
        var a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var distKm = R * c; // Distance in km

        return distKm;
    }

    function distance(locA, locB) {
        return getDistanceFromLatLonInKm(
            locA.latitude, locA.longitude, 
            locB.latitude, locB.longitude
        );
    }

    function markLocationsSurveyMeta(locations, home, type) {
        locations.forEach(function (location) {
            location.pickType = type;
            location.homeDist = distance(home, location.location);
        });
    }

    function pullRoutesfromLocs(fileContents){
        var days = parseLocationJson(fileContents);
        for(var d in days){
            days[d].sort(function(a,b) {return (a.millis > b.millis) ? 1 : ((b.millis > a.millis) ? -1 : 0);});
        }

        //Data is now split into days sorted in order of timestamp (ascending)

        //We want to pull out an interesting route from the data
        //"Interesting" is subjective; I'll define some hopefully fairly standard characteristics here:
        // Route should be (somewhat) unique within the data
        // Route's starting point or destination should be an points of "interest" (POI) (again, subjective), or should contain POIs

        //As a basic way of identifying POIs, we can create a list of places where the traveller stays for some period of time
        //This might include a museum or a park, but also more mundane places like a hotel or a train station, for example
        //If the user starts from, ends at, or passes(?) along the way at one of these places, the route may become more interesting

        //Multiple methods for clustering; K-means may be infeasible because we can't know the number of clusters we want;
        // for now, I'm using DBSCAN and averaging the labels to find cluster centers
        // Disadvantage of DBSCAN is that I have to specify a set size for a cluster, which can be limiting
        // Other options are heirarchical clustering and K-Means.

        //We'll find the best route from each day and return the starting latitude and longitude 
        var route_starts = []
        for(var d in days){
            data = days[d]
            latlngs = []
            latlngtime = []
            for(var l in data){
                var line = data[l]
                latlngs.push([parseFloat(line['latitude']), parseFloat(line['longitude'])])
                latlngtime.push([parseFloat(line['latitude']), parseFloat(line['longitude']), parseInt(line['millis'])])
            }
            var poiscanner = new DBSCAN();
            // This will return the assignment of each point to a cluster number, 
            // points which have  -1 as assigned cluster number are noise.
            var pois = poiscanner.run(latlngs, 0.0005, 10);

            //Associate points with their POIs
            scanner_clusters = {}
            for(var i = 0; i < pois.length; i++){
                scanner_clusters[i] = [0, 0, 0];
                cluster = pois[i];
                for(var j = 0; j < cluster.length; j++){
                    point = latlngs[cluster[j]];
                    scanner_clusters[i][0] += point[0];
                    scanner_clusters[i][1] += point[1];
                    scanner_clusters[i][2] += 1;

                    latlng = latlngtime[cluster[j]];
                    latlng.push(i);
                }

                //Average to obtain the center of the poi (for viz purposes)
                scanner_clusters[i][0] /= scanner_clusters[i][2];
                scanner_clusters[i][1] /= scanner_clusters[i][2];
            }

            for(var i = 0; i < poiscanner.noise.length; i++){
                latlng = latlngtime[poiscanner.noise[i]];
                latlng.push(-1);
            }
          
            //------------------------------
            //Another important feature is the uniqueness of a route
            //We can create an index measuring the uniqueness of each point, with a slight fuzzing of the data
            
            //Uniqueness here is binary, where anything that gets clustered is not unique 
            var uniquescanner = new DBSCAN();
            var uniques = uniquescanner.run(latlngs, 0.00005, 2);

            for(var i = 0; i < uniques.length; i++){
                scanner_clusters[i] = [0, 0, 0];
                cluster = uniques[i];
                for(var j = 0; j < cluster.length; j++){
                    point = latlngs[cluster[j]];
                    latlng = latlngtime[cluster[j]];
                    latlng.push(i);
                }
            }

            //-1 (noise) means unique; >= 0 means the point was clustered, so it's not unique
            for(var i = 0; i < uniquescanner.noise.length; i++){
                latlng = latlngtime[uniquescanner.noise[i]];
                latlng.push(-1);
            }
            
            //------------------------------
            //We can partition the data into "routes"; for now, let's say a route ends when the user stays in a POI for 30 minutes (1800000 millisecs)
            //This allows the user to amble and stop at certain places within the larger picture of going somewhere, 
            // thereby flagging routes with interesting, but intermediate, stops
            //These routes are consecutive and non-overlapping (i.e. each lat/lng is in exactly one route)
            //However, a route is only valid if it goes outside of a POI (i.e. cannot exclusively be within a POI, like sleeping)
                
            routes = []
            curr_route = []
            poi_count = 0
            poi_time_count = 0
            prev_time = -1
            curr_time = -1
            curr_poi = -2
            changed_pois = false

            for(var i = 0; i < latlngtime.length; i++){
                point = latlngtime[i]
                latlng = [point[0], point[1]]
                curr_time = point[2]
                if(prev_time == -1){
                    prev_time = curr_time
                }
                label = point[3]
                //Not in POI: considered to be moving along a route
                if(label == -1){
                    poi_count = 0
                    poi_time_count = 0
                    curr_poi = -1
                    changed_pois = true
                }
                //In a POI: If we stay in this POI for too long, the route ends
                else{
                    poi_count += 1
                    poi_time_count += curr_time - prev_time
                    if(curr_poi != label && curr_poi != -2){
                        changed_pois = true
                        poi_count = 0
                        poi_time_count = 0
                    }
                    curr_poi = label
                    if(poi_time_count >= 300){ //300 = 5 minutes; 900 = 15 minutes
                        poi_count = 0
                        poi_time_count = 0
                        if(changed_pois && curr_route.length >= 10){
                            //Split the route into 10-minute pieces
                            splits = 0
                            start_time = curr_route[0][2]
                            end_time = start_time + 600;
                            mini_route = []
                            for(var l in curr_route){
                                latlng = curr_route[l];
                                if(start_time >= end_time && mini_route.length >= 5){
                                    splits++;
                                    routes.push(mini_route);
                                    start_time = latlng[2];
                                    end_time = start_time + 600;
                                    mini_route = [];
                                }else if(start_time >= end_time){
                                    start_time = latlng[2];
                                    end_time = start_time + 600;
                                    mini_route = [];
                                }
                                mini_route.push(latlng);
                                start_time += latlng[2]-start_time;
                            }
                            if(splits > 0){
                                routes[routes.length-1].concat(mini_route)
                            }else if(mini_route.length >= 5){
                                routes.push(mini_route);
                            }
                        }
                        curr_route = [point]
                        changed_pois = false
                        continue
                    }
                }
                        
                //We only start tracking the route once we leave the POI we started in
                if(changed_pois){
                    curr_route.push(point)
                }
            }
            console.log(routes.length + " routes found on " + d);
            
            if(routes.length == 0){
                continue;
            }
            
            //------------------------------
            //These two metrics, uniqueness and the presence of POIs, can be used to score routes and then select an interesting one
            //Experimentally, each unique lat/lng is worth 1 point, and each lat/lng spent in a POI is worth 1 point
            //Each lat/lng's score is modified by its accuracy(?)
            //Then the total score is divided by the total number of lat/lngs, to standardize scores
            
            route_scores = []
            for(var r in routes){
                var route = routes[r];
                var score = 0.0
                for(var l in route){
                    latlng = route[l];
                    if(latlng[4] == -1){ //Unique point
                        score += 1
                    }
                    if(latlng[3] != -1){ //POI
                        score += 1
                    }
                }
                //Normalize for number of points
                score /= route.length;
                route_scores.push([route, score])
            }
        
            top_route = [[], -1]
            for(var r in route_scores){
                route = route_scores[r];
                if(route[1] > top_route[1]){
                    top_route = route
                }
            }
                    
            top_route = top_route[0];
            route_starts.push(top_route[0]);
        }
        for(var r in route_starts){
            route_starts[r]['latitude'] = route_starts[r][0];
            route_starts[r]['longitude'] = route_starts[r][1];
            route_starts[r]['millis'] = route_starts[r][2];
            route_starts[r]['date'] = moment.unix(route_starts[r]['millis']).format('YYYY-MM-DD');
        }
        processLocations(route_starts, days);
    }

    function processLocations(locations, days) {
        $("#upload-wrapper").hide();

        var imageIndex = 0;

        var urls = generateStreetViewUrls(locations, false);

        var questionsHtml = "";

        var questionHtmlTpl = "" +
            "<div class='location-questions' id='q{{INDEX}}'>" +
            "<div class='image-pano' style='position:relative'>" + 
                "<img class='location' crossorigin='anonymous' src='{{SRC}}' data-id='pano{{INDEX}}' data-date='{{DATE}}' data-millis='{{MILLIS}}' data-lat='{{LAT}}' data-lon='{{LON}}' style='width:"+ panoWidth +"px; height:"+ panoHeight +"px;'></img>" +
                "<div class='hyperlapse' style='display:none'></div>" +
            "</div>" +
            "<pre class='location-meta'>{{LOCMETA}}</pre>" +
            "<div style='clear: both;''></div>" +
            "</div>";


        urls.forEach(function(url, i) {
            //console.log(url)
            var questionHtml = questionHtmlTpl
                .replace("{{SRC}}", url)
                .replace(/{{INDEX}}/g, i)
                .replace("{{DATE}}", locations[i].date)
                .replace("{{LAT}}", locations[i].latitude)
                .replace("{{LON}}", locations[i].longitude)
                .replace("{{MILLIS}}", locations[i].millis)
                //.replace("{{LOCMETA}}", "" + locations[i].pickType + (locations[i].homeDist * 1000).toFixed(0));

            questionsHtml += questionHtml;
        });


        var $resDiv = $("#question-list");
        questionsHtml = "<canvas id='rainLayer' width='640' height='640' style='margin-top: -55px; position: absolute;z-index:100; display: none'></canvas>" 
        + "<canvas id='snowLayer' width='640' height='640' style='margin-top: -55px; position: absolute;z-index:100; display: none'></canvas>" 
        + "<img class='play-icon' src='img/play.png' style='position:absolute; top:0px; left:0px; width:100px; margin:32% 42%;'>"
        + questionsHtml;
        $resDiv.html(questionsHtml);
        //render precipitation
        renderPrec('rain');
        renderPrec('snow');

        //adding rain audio
        var audio = document.createElement('audio');
        var source = document.createElement('source');
        source.src = './audio/rain.mp3';
        audio.appendChild(source);
        audio.loop = true;

        $(".image-pano > img.location").each(function() {
            var millis = $(this).attr("data-millis");
            var lat = $(this).attr("data-lat");
            var lon = $(this).attr("data-lon");
            var id = $(this).attr('data-id');
            var date = $(this).attr("data-date")
            this.onload = function() {
                manipulateImage(this, millis, lat, lon, id);
            };
        })

        $(".play-icon").click(function() {

            $('.active').find('.image-pano').each(function(){
                $(this).addClass('loading-hyperlapse');
            })
            var $img = $('.active').find('.image-pano').find(".location");

            var locations = getRoutefromStart($img.attr("data-millis"), days[$img.attr("data-date")]);

            var id = $img.attr("data-id");
            var millis = $img.attr("data-millis");
            var lat = $img.attr("data-lat");
            var lon = $img.attr("data-lon");

            window.modifyHyperlapseImages = function(image, callback) {
                manipulateImage(image, millis, lat, lon, id, callback);
            };

            console.log('Creating Rewind from '+$img.attr("data-date")+' at ('
            +$img.attr("data-lat")+', '+$img.attr("data-lon")+')');

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
        $("#q0").addClass('active')

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

            

            yesCounter = 0;
            answers.forEach(function(answer) {
                if (answer["q1"] == "true")
                    yesCounter++;
            });
            alert("You remember " + yesCounter + " our of " + answers.length + " places");
        });

        $("#nextButton").click(function() {
            $("div.hyperlapse").hide().find("*").remove();
            $("img.location, canvas.location").show().parent().removeClass("loading-hyperlapse");

            $("#backButton").visible();
            if (imageIndex < urls.length - 1) {
                $("#q" + imageIndex).hide();
                imageIndex++;
            }
            if (imageIndex == urls.length - 1) {
                $("#nextButton").invisible();
            }
            $("#q" + imageIndex).show();
            $("#q" + (imageIndex - 1)).removeClass('active')
            $("#q" + imageIndex).addClass('active')
            $(".play-icon").css("display","");

            var $img = $("#q" + imageIndex + ">" + ".image-pano").find(".location");
            var cur_weather = $img[0].attributes[11].value;
            changeWeather(cur_weather, animate, audio);
            $("#playButton").off();
            $("#playButton").invisible();
        });

        $("#backButton").click(function() {
            $("div.hyperlapse").hide().find("*").remove();
            $("img.location, canvas.location").show().parent().removeClass("loading-hyperlapse");

            $("#nextButton").visible();
            if (imageIndex > 0) {
                imageIndex--;
            }
            if (imageIndex == 0) {
                $("#backButton").invisible();
            }
            $("#q" + (imageIndex + 1)).hide();
            $("#q" + (imageIndex + 1)).removeClass('active')
            $("#q" + imageIndex).show();
            $("#q" + imageIndex).addClass('active');
            $(".play-icon").css("display","");
            // console.log("Showing: #q" + imageIndex + " imageIndex: " + imageIndex + " imageCount: " + urls.length);
            var $img = $("#q" + imageIndex + ">" + ".image-pano").find(".location");
            var cur_weather = $img[0].attributes[11].value;
            // console.log(cur_weather);
            changeWeather(cur_weather, animate, audio);
            //if ($("#playButton")) $("#playButton").remove();
            $("#playButton").off();
            $("#playButton").invisible();
        });
    }

    function getRoutefromStart(millis, day){
        //Find the start of the route within the day
        var p = 0;
        for(; p < day.length; p++){
            if(day[p]['millis'] == millis){
                break;
            }   
        }
        start = day[p];
        console.log(start);
        //Pull out 10 minutes
        route_points = [start]
        end_time = parseInt(start['millis']) + 600; //number of seconds later to end the route (e.g. 600 = 10 minutes)
        p++;
        for(; p < day.length; p++){
            point = day[p];
            if(parseInt(point['millis']) >= end_time){
                break;
            }
            route_points.push(point);
        }
        return route_points;
    }

    function get10MinLoc (date, startMillis) {
        var locations = locationsByDate[date];
        startMillis = parseInt(startMillis);
        var endMillis = startMillis + 1000 * 60 * 10;

        var uniqLocations = [];
        var uniq = {};

        locations.forEach(function(location, i){
            if ((location.millis >= startMillis) && (location.millis <= endMillis)){
                //getting 3 digites after decimal point
                var key = location.latitude.toFixed(7) + "_" + location.longitude.toFixed(7);
                if (uniq[key]) return;
                else uniq[key] = true;
                uniqLocations.push(location);
            }
        });

        uniqLocations.sort(function(a, b) {
            return a.millis - b.millis;
        });

        return uniqLocations;
    }



    function getLocationsOnDate(date) {
        var locationHtml = "";
        //console.log(locationsByDate);
        var locations = locationsByDate[date];
        locations.sort(function(a, b) {
            return a.millis - b.millis;
        });

        var uniqLocations = []
        var uniq = {}

        locations.forEach(function(location, i) {
            var date = location.millis;
            // always get up to the first 7 digits after decimal
            var lat = location.latitude.toFixed(7);
            var lon = location.longitude.toFixed(7);


            // location unique to 3 digits after decimal point
            var latSig = parseFloat(lat).toFixed(3);
            var lonSig = parseFloat(lon).toFixed(3);
            var key = latSig + "_" + lonSig;

            if (uniq[key]) {
                return;
            } else {
                uniq[key] = true;
            }

            uniqLocations.push(location);
        });

        //$("#urlList").html("<pre>"+locationHtml+"</pre>")
        return uniqLocations;
    }

    function generateStreetViewUrls(locations, uniq) {
        var urls = [];
        var uniq = {}

        locations.forEach(function(location, i) {
            urls.push(generateStreetViewUrl(location));
        });

        return urls;
    }

    function generateStreetViewUrl(location) {
        // always get up to the first 7 digits after decimal
        var lat = location.latitude.toFixed(7);
        var lon = location.longitude.toFixed(7);

        var streetViewUrl = "https://maps.googleapis.com/maps/api/streetview?key=" + API_KEY + "&size="+ panoWidth +"x"+ panoHeight +"&location=" + lat + "," + lon + "&fov=90&heading=270&pitch=10";

        return streetViewUrl;
    }

    function parseLocationJson(locJson) {
        var obj = JSON.parse(locJson);
        var results = {};

        obj.locations.forEach(function(location, i) {
            if (location.accuracy > 200) return;

            var lat = location.latitudeE7 * 0.0000001;
            var lon = location.longitudeE7 * 0.0000001;
            //console.log("Latitude: " + lat + "    Longitude: " + lon);

            //time checks
            //convert to seconds
            var timeMs = parseInt(location.timestampMs);
            if(timeMs / 10000000000 > 1){
                location.timestampMs = Math.round(parseInt(location.timestampMs)/1000);
                timeMs = location.timestampMs;
            }
            var date = moment.unix(timeMs).format("YYYY-MM-DD");
            if (!results[date]) {
                results[date] = [];
            }
            results[date].push({
                latitude: lat,
                longitude: lon,
                millis: timeMs,
                date: date
            });
        });

        return results;
    };

});
