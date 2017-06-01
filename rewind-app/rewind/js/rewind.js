//Routes by week/day/month (allow for choice)
//Gray images
//Repeat images


$(function() {
    var Caman = require('caman');
    var animate;

    var API_KEY = 'AIzaSyC_GSlJw9b4ns8AHndV-EMp-kCA35ZAvSE';

    TIMEZONE_API = "https://maps.googleapis.com/maps/api/timezone/json?key=" + API_KEY + "&location={{LAT}},{{LON}}&timestamp={{MILLIS}}";

    var ambiance = null;
    var panoWidth  = 640;
    var panoHeight = 640;
    var urls;
    var routes_for_the_day = [];
    var directions_service;
    var days;
    var currday;
    var audio, source;



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
        var routes = [locations];
        var gResults = [];
            getGoogleRoute(routes, gResults, 0, function() {
                var routeSequence = StreetviewSequence($(pano), {
                    route: mergeGoogleResponses(gResults),
                    duration: 8000,
                    totalFrames: 100,
                    loop: true,
                    width: panoWidth,
                    height: panoHeight,
                    domain: 'http://maps.googleapis.com',
                    key: API_KEY,
                });

                routeSequence.progress(function(p){
                    var curVal = parseInt(p * 100);
                    $('.progress-bar').attr('aria-valuenow', curVal).css('width', curVal + "%");
                    console.log('%f% loaded', curVal);
                })

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

                    //ambiance = new Audio("./audio/thunder.mp3");
                    // ambiance.play();

                    //when cursor is on rewind video
                    $('#question-list').on("mousemove", function(event) {
                        var mouseX = parseInt(event.pageX - parseInt($(pano).offset().left));
                        var mouseY = parseInt(event.pageY - parseInt($(pano).offset().top));
                        //renderPrec('snow');
                        // console.log( "pageX: " + mouseX + ", pageY: " + mouseY );
                        var imagePos = mouseX / panoWidth;
                        //console.log("Frame progress:", imagePos);
                        player.setProgress(imagePos);
                    });
                });
            });
       // }
    }

    //process uploaded google location data
    var dragArea = document.getElementById('file-drop-area');
    dragArea.ondragover = function () { this.className = 'dragging'; return false; };
    dragArea.ondragend = dragArea.ondragleave = function () { this.className = ''; return false; };
    dragArea.ondrop = function (e) {
        this.className = '';
        e.preventDefault();
        handleUploadedFile(e.dataTransfer.files[0]);
        //console.log(e.dataTransfer.files[0])
    }

    var fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        handleUploadedFile(fileInput.files[0]);
    });

    function handleUploadedFile(file) {
        $("#upload-wrapper").html("");

        var reader = new FileReader();

        reader.readAsText(file);
        reader.addEventListener('load', function(e) {
            days = parseLocationJson(reader.result);
            //console.log(reader.result);
            for(var d in days){
                days[d].sort(function(a,b) {return (a.millis > b.millis) ? 1 : ((b.millis > a.millis) ? -1 : 0);});
            }

            missing_days = getMissingDays(days);
            userChoices();
        });
    }

    document.getElementById("sample").addEventListener("click", handleDefaultFile);

    function handleDefaultFile(){
        $.getJSON( "short.json", function( data ) {
                $("#upload-wrapper").html("");
                //console.log(data)
                days = parseLocationJson(data);
                //console.log(data);
            for(var d in days){
                days[d].sort(function(a,b) {return (a.millis > b.millis) ? 1 : ((b.millis > a.millis) ? -1 : 0);});
            }

            missing_days = getMissingDays(days);
            // console.log(missing_days);

            userChoices();

        });
    }

    function userChoices(){
        //Initialize the little box that lets user make choices while viewing routes
        $("#user-choices").fadeIn();
        num_days = getNumDays(days);
        currday = getEarliestDay(days);

        $("#num-days").text(num_days);
        $("#datepicker").datepicker({
            beforeShowDay: function( date ) {
                if(missing_days.has(momentToDate(moment(date)))) {
                    return [false, "missing"];
                } else {
                    return [true, '', ''];
                }
            },
            dateFormat: "yy/mm/dd",
            minDate: getEarliestDay(days).toDate(),
            maxDate: getLastDay(days).toDate(),
            onSelect: function(dateText){
                processCalendar(dateText)
            }
        });

        $("#datepicker").datepicker("setDate",getEarliestDay(days).toDate());

        period_choice = $("input[name='length']:checked").attr("value")

        startRewind(getEarliestDay(days))
        $("#upload-wrapper").html("<img src='img/loading.gif' style='width:50px; margin: 20px 275px'></img>");
    }

    function isWinter(month, lat) {

        return ( month == 12 || month == 1 || month == 2 );
    }

    function isSummer(month, lat) {

        return  ( month == 6 || month == 7 || month == 8 );
    }

    function isSpring(month, lat) {

        return  ( month == 3 || month == 4 || month == 5 );
    }

    function isFall(month, lat) {

        return ( month == 9 || month == 10 || month == 11 )
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
        var utcDate  = new Date(0);
        utcDate.setUTCSeconds(millis);
        var hour = utcDate.getHours();
        var month = utcDate.getMonth() + 1;
        //console.log(month);
        //console.log(hour);

        var timeZoneUrl = timeZoneUrlTpl
                .replace("{{LAT}}", lat)
                .replace("{{LON}}", lon)
                .replace("{{MILLIS}}", millis.replace(/\d\d\d$/,""));


        // TODO : account for some hours that are skipped in data
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

            var saturation = 0;
            var exposure = 0;


            var parent = image.parentNode;
            if (!parent) {
                parent = document.createElement("div");
                parent.appendChild(image);
            }
            //console.log(image);

            // log data on image attributes
            //getWeather(myurl, function(weather){
                var weather = "normal"
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
                            changeWeather('rain', animate, audio)
                            break;
                        case 'snow':
                            changeWeather('snow', animate, audio)
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
                   //console.log(season);

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
                    $(newImage).attr("route-id", $(image).attr("route-id"));
                    return caman.pipeline(function () {
                        this.saturation(saturation);
                        this.exposure(exposure);
                        this.contrast(contrast);
                        if (weather != 'normal' && hour < 12) this.vibrance(-100);//this.contrast(100); this.sepia(100);
                    }).then(function () {
                        changeHues (parent.childNodes[0], weather, season, hour);
                        if (callback) callback(parent.childNodes[0]);

                    });
                });
            });
        //});
    }

    function getMonth(dateString) {
        return dateString.split("-")[1];
    }

    function getDate(dateString) {
        return dateString.split("-")[2];
    }

    function getCurrPeriod(p_choice, start_date){
        //Given the starting date and the length of the period, returns the JSON object combining all days' data from that period
        //e.g. if the p_choice = "week" and start_date is a Wednesday, returns all location data from Wednesday through Sunday

        //Note: we do assume here that a "week" is monday-sunday, not sunday-saturday. maybe future versions could be more locale-aware?

        //Note: For now, we are assuming p_choice always == "day" (in order to simplify the UX)
        p_choice = "day"

        period_keys = []
        max_date = getLastDay(days)

        temp_date = getCurrPeriodDate(p_choice, start_date)

        first_date = getEarliestDay(days)
        while(first_date.isAfter(temp_date)){
            temp_date.add(1, 'days')
        }

        //If one-day period, end of week with week, or end of month with month, or end of custom period, return
        while(!(max_date.isBefore(temp_date))){
            period_keys.push(momentToDate(temp_date))
            temp_date.add(1, 'days')

            if(p_choice == "day" || (p_choice == "week" && temp_date.isoWeekday() == 7) || (p_choice == "month" && temp_date.date() == temp_date.daysInMonth())){
                break
            }
        }

        period = []
        for(var p in period_keys){
            period = period.concat(days[period_keys[p]])
        }

        return period
    }

    function getNextPeriodDate(p_choice, day){
        //Given a date and the period length, returns the moment.js object of the next period's starting date
        //e.g. if start_date = March 15 and the p_choice = "month", returns the moment.js for April 1
        start_date = moment(day.format("YYYY-MM-DD"))
        p_choice = "day";
        if(p_choice == "day"){
            start_date.add(1, 'days');
        }else if(p_choice == "week"){
            start_date.day(8) //Next Monday
        }else if(p_choice == "month"){
            start_date.add(1, 'month')
            start_date.date(1)
        }

        //To deal with holes in the data (i.e. days where no data is collected):
        if(!days[momentToDate(start_date)] && (start_date.isSame(getLastDay(days)) || start_date.isBefore(getLastDay(days)))){
            console.log("No data collected on " + start_date.format("YYYY-MM-DD") + ". Moving to next day")
            return getNextPeriodDate(p_choice, start_date)
        }
        return start_date
    }

    function getCurrPeriodDate(p_choice, day){
        //Given a date and the period length, returns the moment.js object of the current period's starting date
        //e.g. if start_date = March 15 and the p_choice = "month", returns the moment.js for March 1
        start_date = moment(day.format("YYYY-MM-DD"))
        p_choice = "day";
        if(p_choice == "day"){
            //No change
        }else if(p_choice == "week"){
            start_date.day(1) //This (past) Monday
        }else if(p_choice == "month"){
            start_date.date(1)
        }

        //If the current period date does not exist,
        return start_date
    }

    function getPrevPeriodDate(p_choice, day){
        //Given a date and the period length, returns the moment.js object of the previous period's starting date
        //e.g. if start_date = March 15 and the p_choice = "month", returns the moment.js for February 1
        start_date = moment(day.format("YYYY-MM-DD"))
        p_choice = "day";
        if(p_choice == "day"){
            start_date.subtract(1, 'days');
        }else if(p_choice == "week"){
            start_date.day(-8); //Last Monday
        }else if(p_choice == "month"){
            start_date.subtract(1, 'month')
            start_date.date(1)
        }

        //To deal with holes in the data (i.e. days where no data is collected):
        if(!days[momentToDate(start_date)] && (start_date.isSame(getEarliestDay(days)) || start_date.isAfter(getEarliestDay(days)))){
            console.log("No data collected on " + start_date.format("YYYY-MM-DD") + ". Moving to previous day")
            return getPrevPeriodDate(p_choice, start_date)
        }
        return start_date
    }

    function startRewind(start_date){
        //initializes events and route selects for the first period
        initializeEvents();
        period = getCurrPeriod($("input[name='length']:checked").attr("value"), start_date)
        processPeriod(period, "next")
    }

    routes_for_the_day = []
    function processPeriod(period, direction){
        //period is an objects with keys "YYYY-MM-DD" and values as location data
        //(it is a subset of the original days variable)

        //an array of all the routes
        routes_for_the_day = pullRoutesfromLocs(period, 1);

        if(routes_for_the_day.length == 0){
            if(direction == "next"){
                console.log("No routes found: Obtaining next data range.");
                var nextday = getNextPeriodDate($("input[name='length']:checked").attr("value"), currday);
                if(nextday.isBefore(getLastDay(days)) || nextday.isSame(getLastDay(days))){
                    period = getCurrPeriod($("input[name='length']:checked").attr("value"), nextday)
                    currday = nextday
                    return processPeriod(period, direction);
                }else{
                    alert("We found 0 routes in the remainder of your data.");
                    return null;
                }
            }else if(direction == "back"){
                console.log("No routes found: Obtaining previous data range.");
                var prevday = getPrevPeriodDate($("input[name='length']:checked").attr("value"), currday);
                if(prevday.isAfter(getEarliestDay(days)) || prevday.isSame(getEarliestDay(days))){
                    period = getCurrPeriod($("input[name='length']:checked").attr("value"), prevday)
                    currday = prevday
                    return processPeriod(period, direction);
                }else{
                    alert("We found 0 routes in the remainder of your data.");
                    return null;
                }
            }
        }

        //Make the current date the date of the route
        currday = moment.unix(routes_for_the_day[0][2])
        $("#route-date").text(currday.format('YYYY-MM-DD'))
        $("#datepicker").datepicker("setDate",currday.toDate());

        processLocations(routes_for_the_day)
    }

    function processCalendar(date_text){
        currday = moment(date_text)
        period = getCurrPeriod($("input[name='length']:checked").attr("value"), currday)
        processPeriod(period, "next")
    }

    //Pulls out route start information for processLocations
    function getRouteInfo(route){
        route_start = route[0];
        route_start['latitude'] = route_start[0];
        route_start['longitude'] = route_start[1];
        route_start['millis'] = route_start[2];
        route_start['date'] = moment.unix(route_start['millis']).format('YYYY-MM-DD');

        return route_start
    }

    //Determines which buttons (between Next and Back)
    function buttonValidity(){
        //Depending on the period choice and the curr date
        p_choice = $("input[name='length']:checked").attr("value")
        max_date = getLastDay(days);
        first_date = getEarliestDay(days);

        prev_date = getPrevPeriodDate(p_choice, currday)
        next_date = getNextPeriodDate(p_choice, currday)

        //console.log(prev_date.format("YYYY-MM-DD"), currday.format("YYYY-MM-DD"), next_date.format("YYYY-MM-DD"))

        if(max_date.isBefore(next_date)){
            $("#nextButton").off("click");
            $("#nextButton").css("opacity", 0.5)
        }else{
            nextButtonEvent(urls, animate, audio);
            $("#nextButton").css("opacity", 1)
        }

        if(first_date.isAfter(prev_date)){
            $("#backButton").off("click");
            $("#backButton").css("opacity", 0.5)
        }else{
            backButtonEvent(urls, animate, audio);
            $("#backButton").css("opacity", 1)
        }
    }


//showing the first image of each route
    function processLocations(locations) {
        $("#upload-wrapper").hide();
        urls = generateStreetViewUrls(locations, false);

        var questionsHtml = "";

        var questionHtmlTpl = "" +
            "<div class='location-questions' id='{{INDEX}}'>" +
            "<div class='image-pano' style='position:relative'>" +
                "<img class='location' crossorigin='anonymous' src='{{SRC}}' data-id='pano{{NUM}}' route-id='{{NUM}}' data-date='{{DATE}}' data-millis='{{MILLIS}}' data-lat='{{LAT}}' data-lon='{{LON}}' style='width:"+ panoWidth +"px; height:"+ panoHeight +"px;'></img>" +
                "<div class='hyperlapse' style='display:none'></div>" +
            "</div>" +
            "<pre class='location-meta'>{{LOCMETA}}</pre>" +
            "<div style='clear: both;''></div>" +
            "</div>";


        urls.forEach(function(url, i) {
            var questionHtml = questionHtmlTpl
                .replace("{{SRC}}", url)
                .replace(/{{INDEX}}/g, "route" + i)
                .replace("{{DATE}}", locations[i][0].date)
                .replace("{{LAT}}", locations[i][0].latitude)
                .replace("{{LON}}", locations[i][0].longitude)
                .replace("{{MILLIS}}", locations[i][0].millis)
                .replace(/{{NUM}}/g, i)
                //.replace("{{LOCMETA}}", "" + location.pickType + (location.homeDist * 1000).toFixed(0));

            questionsHtml += questionHtml;
        });

        var $resDiv = $("#question-list");
        questionsHtml = "<canvas id='rainLayer' width='640' height='640' style='margin-top: -55px; position: absolute;z-index:100; display: none'></canvas>"
        + "<canvas id='snowLayer' width='640' height='640' style='margin-top: -55px; position: absolute;z-index:100; display: none'></canvas>"
        + "<div id='progressLayer'><div class='progress-bar' role='progressbar' aria-valuenow='0' aria-valuemin='0' aria-valuemax='100' style='width:0%; height:10px; margin-top: -105px; position: absolute;z-index:105;'></div></div>"
        + "<img class='play-icon' src='img/play.png' style='position:absolute; top:0px; left:0px; width:100px; margin:32% 42%;'>"
        + questionsHtml;
        $resDiv.html(questionsHtml);
        //render precipitation
        renderPrec('rain');
        renderPrec('snow');

        //adding rain audio
        audio = document.createElement('audio');
        source = document.createElement('source');
        source.src = './audio/rain.mp3';
        audio.appendChild(source);
        audio.loop = true;

        $(".image-pano > img.location").each(function() {
            var millis = $(this).attr("data-millis");
            var lat = $(this).attr("data-lat");
            var lon = $(this).attr("data-lon");
            var id = $(this).attr('data-id');
            var date = $(this).attr("data-date")
            //console.log($(this).attr('data-date'));
            this.onload = function() {
                manipulateImage(this, millis, lat, lon, id);
            };
        })

        $(".location-questions").each(function() {
            $(this).hide();
        });

        $("#route0").show();
        $("#route0").addClass('active')

        buttonValidity();

        $(".play-icon").click(function() {

            $('.active').find('.image-pano').each(function(){
                $(this).addClass('loading-hyperlapse');
            })
            var $img = $('.active').find('.image-pano').find(".location");

            var locations = routes_for_the_day[$img.attr("route-id")];
            // console.log($img.attr("route-id"));
            // console.log(routes_for_the_day);
            // console.log(locations);

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
    }


    function generateStreetViewUrls(locations) {
        var urls = [];

        locations.forEach(function(location, i) {
            urls.push(generateStreetViewUrl(location));
        });

        return urls;
    }

    function generateStreetViewUrl(location) {
        // always get up to the first 7 digits after decimal
        var lat = location[0].latitude.toFixed(7);
        var lon = location[0].longitude.toFixed(7);

        var streetViewUrl = "https://maps.googleapis.com/maps/api/streetview?key=" + API_KEY + "&size="+ panoWidth +"x"+ panoHeight +"&location=" + lat + "," + lon + "&fov=90&heading=270&pitch=10";

        return streetViewUrl;
    }

    function parseLocationJson(locJson) {
        if (typeof locJson === 'string' || locJson instanceof String){
            var obj = JSON.parse(locJson);
        }else{
            var obj = locJson;
        }

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
