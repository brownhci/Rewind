//Routes by week/day/month (allow for choice)
//Gray images
//Repeat images


$(function() {

    // resizes video based on user's screensize
    var panosize = Math.ceil(screen.height/1050 * 640);
    var pano_element_IDs = ["slider-div", "question-list", "loading-box", "video"];
    var pano_element_classes = ["location-questions", "image-pano"];

    for (i = 0; i < pano_element_IDs.length; i++) {
        pano_element = pano_element_IDs[i];
        document.getElementById(pano_element).style.setProperty('--panosize', panosize + 'px');
    }

    for (i = 0; i < pano_element_classes.length; i++) {
        pano_element = pano_element_classes[i];
        var els = document.getElementsByClassName(pano_element);
        for (j = 0; j < els.length; j++) {
            els[j].style.setProperty('--panosize', panosize + 'px');
        }
    }

    var Caman = require('caman');
    var animate;

    var API_KEY = "AIzaSyCJ2JrxoOulDQJM_qW5tp8Zw69eJupcTh4";

    TIMEZONE_API = "https://maps.googleapis.com/maps/api/timezone/json?key=" + API_KEY + "&location={{LAT}},{{LON}}&timestamp={{MILLIS}}";

    var ambiance = null;
    var panoWidth  = panosize;
    var panoHeight = panosize;
    var imageIndex = 0;
    var urls;
    var routes_for_the_day = [];
    var directions_service;
    var days;
    var currday;
    var audio, source;
    var getGRouteDfd;
    var map, directionsService, directionsDisplay;
    var sliderVal = 0;
    var weather;
    var tmppv, progressVal = 0;
    var globPlayer;

    var GRouteResponse = [];

    var roadMapStyle = [
  {
    featureType: "administrative",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "landscape",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "poi",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "road",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "transit",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "water",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  }
];

function initMap(latVal, lngVal, response) {
        directionsService = new google.maps.DirectionsService;
        directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
        map = new google.maps.Map(document.getElementById('map'), {
          zoom: 17,
          center: {lat: latVal, lng: lngVal},
          mapTypeIds: ['roadMapStyle', google.maps.MapTypeId.ROADMAP],
          zoomControl: true
        });
        directionsDisplay.setMap(map);
        directionsDisplay.setDirections(response);
 }

 function updateMap(latVal, lngVal, response){
    map.setCenter(googleLatLng(latVal, lngVal));
    directionsDisplay.setDirections(response);
 }

  function createHyperlapse(pano) {
        console.log('createHyperlapse called')
        $(pano).html("<img src='img/loading.gif' style='width:50px; margin:275px 275px'></img>");
        $("#playButton").html("&#9658");
        
        var gResults = [];

        console.log('createHyperlapse called 2')
        console.log(gResults)
            //getGoogleRoute(routes, gResults, 0, function() {
                var routeSequence = StreetviewSequence($(pano), {
                    //route: mergeGoogleResponses(gResults),
                    route: GRouteResponse,
                    loop: false,
                    width: panoWidth,
                    height: panoHeight,
                    domain: 'http://maps.googleapis.com',
                    key: API_KEY,
                });

                console.log('routeSequence:')
                console.log(routeSequence)

                routeSequence.progress(function(p){
                    console.log(GRouteResponse);

                    progressVal = parseInt(p * 100 / GRouteResponse.length);
                    //if (progressVal != tmppv){
                        $("#loading-box").html("Loading Rewind: " + progressVal + "% completed" );
                    //}
                    //tmppv = progressVal;
                })

                routeSequence.done(function(player) {
                    globPlayer = player;
                    switch(weather){
                            case 'rain':
                                changeWeather('rain', animate, audio)
                                break;
                            case 'snow':
                                changeWeather('snow', animate, audio)
                                break;
                        }
            
                    //0: initial state - need to hide img and show canvas
                    //1: 
                    //2: stopped
                    var playState = 0;

                    $("#slider").slider({
                        range: false,
                        min: 0,
                        max: 100,
                        step:.1,
                        slide: function ( event, ui ) {
                        globPlayer.pause();
                        //adjust the timeline's progress() based on slider value
                        sliderVal = ui.value / 100;
                        globPlayer.setProgress( sliderVal );
                        }
                    }); 

                    console.log('done loading')

                    $("#loading-box").hide();
                    $("#slider").slider("enable");
                    $("#slider-div").show();
                    $("#playButton").visible();
                    $("#playButton").html("&#9658");
                    $("#playButton").css("background-color", "#009aff");
                    $("#playButton").css("color", "white");


                    $("#panButton").removeAttr('disabled');
                    $("#panButton").css("color", "white");
                    $("#panButton").css("borderColor", "#ccc");
                    $("#playButton").removeAttr('disabled');

                    $("#playButton").click(function() {
                        if (playState == 0){
                            $(pano).find("img").hide();
                            $(pano).find("canvas").show();
                            $("#playButton").html("&#10073;"+" "+"&#10073");
                            $(pano).show();
                            $(pano.parentNode).find('.location').hide();

                            //set player to current ui value
                            globPlayer.setProgress(sliderVal);
                            globPlayer.play();
                            playState = 1;
                        }else if (playState == 1){
                            $("#playButton").html("&#9658"); // switch icon to play button
                            player.pause();
                            playState = 2;
                        }else{
                            if (globPlayer.getProgress()==null) { // check after switching dates to make sure play button can hit after previous rewind is paused
                                sliderVal = 0;
                            }
                            else {
                                sliderVal = globPlayer.getProgress();
                            }
                            
                            globPlayer.setProgress(sliderVal);
                            /*if (sliderVal==1) {
                                sliderVal = 0
                                globPlayer.setProgress(sliderVal);
                            }*/
                            $("#playButton").html("&#10073;"+" "+"&#10073"); // pause rewind
                            globPlayer.play();
                            playState = 1;
                        }
                    });

                    $( "#slider" ).on( "slide", function( event, ui ) {
                        console.log(playState)
                    } );

                    $( "#slider" ).on( "slidestop", function( event, ui ) {
                        if (playState==1) {
                            console.log(playState)
                            globPlayer.setProgress(sliderVal);
                            globPlayer.play();
                        }
                    } );

                    //ambiance = new Audio("./audio/thunder.mp3");
                    // ambiance.play();

                    $("#panButton").visible();

                    $("#panButton").click(function() {
                        var curLat = globPlayer.getLat();
                        var curLon = globPlayer.getLon();
                        console.log(curLat);
                        console.log(curLon);
                        var openURL = "./pan-view.html?lat=" + curLat   
                                                             + "&lon=" + curLon;

                        window.open( openURL, "_blank", "width=" + panoWidth + ",height=" + panoHeight);

                    });

                    /*$("#slider").slider({
                        range: false,
                        min: 0,
                        max: 100,
                        step:.1,
                        slide: function ( event, ui ) {
                        player.pause();
                        //adjust the timeline's progress() based on slider value
                        sliderVal = ui.value / 100;
                        player.setProgress( sliderVal );
                        }
                    }); */

                });
            // });
       // }
    }

    //process uploaded google location data
    var dragArea = document.getElementById('file-drop-area');
    dragArea.ondragover = function () { this.className = 'dragging'; return false; };
    dragArea.ondragend = dragArea.ondragleave = function () { this.className = ''; return false; };
    dragArea.ondrop = function (e) {
        $("#upload-header").html('File loading...');
        $('#or').hide()
        $('#instructions').hide()
        $('#sample').hide()
        $('#upload-wrapper-content').hide()
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
            removeDropArea();
        });
    }

    document.getElementById("sample").addEventListener("click", handleDefaultFile);

    
    /** MODAL STUFF**/

    // about link modal //

    // Get the modal
    var aboutModal = document.getElementById('aboutModal');

    // Get the button that opens the modal
    var aboutBtn = document.getElementById("aboutLink");

    // Get the <span> element that closes the modal
    var aboutSpan = document.getElementsByClassName("close")[0];

    // When the user clicks on the button, open the modal 
    aboutBtn.onclick = function() {
        aboutModal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    aboutSpan.onclick = function() {
        aboutModal.style.display = "none";
    }


    // team link modal //

    // Get the modal
    var teamModal = document.getElementById('teamModal');

    // Get the button that opens the modal
    var teamBtn = document.getElementById("teamLink");

    // Get the <span> element that closes the modal
    var teamSpan = document.getElementsByClassName("close")[1];

    // When the user clicks on the button, open the modal 
    teamBtn.onclick = function() {
        teamModal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    teamSpan.onclick = function() {
        teamModal.style.display = "none";
    }




    // Get the modal
    var modal = document.getElementById('instructions-modal');

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[2];

    document.getElementById("instructions").addEventListener("click", showInstructions);

    function showInstructions(){
        console.log('instructions clicked')
        modal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
        if (event.target == aboutModal) {
            aboutModal.style.display = "none";
        }
        if (event.target == teamModal) {
            teamModal.style.display = "none";
        }
    }


    var prevPage = document.getElementsByClassName("prev")[0];
    var nextPage = document.getElementsByClassName("next")[0];
    prevPage.addEventListener("click", clickPrevPage);
    nextPage.addEventListener("click", clickNextPage);

    function clickNextPage(){
        plusSlides(1);
    }

    function clickPrevPage(){
        plusSlides(-1);
    }


    var slideIndex = 1;
    showSlides(slideIndex);

    function plusSlides(n) {
      showSlides(slideIndex += n);
    }

    function currentSlide(n) {
      showSlides(slideIndex = n);
    }

    function showSlides(n) {
      var i;
      var slides = document.getElementsByClassName("mySlides");
      var dots = document.getElementsByClassName("dot");
      if (n > slides.length) {slideIndex = 1} 
      if (n < 1) {slideIndex = slides.length}
      for (i = 0; i < slides.length; i++) {
          slides[i].style.display = "none"; 
      }
      for (i = 0; i < dots.length; i++) {
          dots[i].className = dots[i].className.replace(" active", "");
      }
      slides[slideIndex-1].style.display = "block"; 
      dots[slideIndex-1].className += " active";
    }

    /*****/

    function handleDefaultFile(){
        $("#upload-header").html('File loading...');
        $('#or').hide()
        $('#instructions').hide()
        $('#sample').hide()
        $('#upload-wrapper-content').hide()
        $.getJSON( "history.json", function( data ) {
                days = parseLocationJson(data);
                //console.log(data);
            for(var d in days){
                days[d].sort(function(a,b) {return (a.millis > b.millis) ? 1 : ((b.millis > a.millis) ? -1 : 0);});
            }

            missing_days = getMissingDays(days);
            // console.log(missing_days);

            userChoices();
            removeDropArea();

        });
    }

    function removeDropArea(){
        var elem = document.getElementById("file-drop-area");
        elem.parentElement.removeChild(elem);
        console.log('hey')
    }

    function userChoices(){
        //Initialize the little box that lets user make choices while viewing routes
        $("#user-choices").fadeIn();
        num_days = getNumDays(days);
        last_day = getLastDay(days);
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
                processCalendar(dateText);
                //plBttnOff();
                GRouteResponse = [];

                $("#playButton").prop("disabled", true);
                //$("#playButton").css("background-color", "white");
                //$("#playButton").css("color", "#009aff");
                $("#slider-div").hide();
                $("#playButton").css("background-color", "#5190ba");
                $("#playButton").css("color", "#d3d3d3");
                $("#playButton").css("borderColor", "#d3d3d3");
                $("#playButton").html("&#9658");

                $("#panButton").prop("disabled", true);
                $("#panButton").css("color", "grey");
                $("#panButton").css("borderColor","grey")

                globPlayer.pause();
             //   globPlayer = null;
                $( "#slider" ).slider( "disable" );
                $( "#slider" ).slider( "value", 0 );

            }
        });

        $("#datepicker").datepicker("setDate",last_day.toDate());

        period_choice = $("input[name='length']:checked").attr("value")

        startRewind(last_day);
        $("#image-wrapper").html("<img src='img/loading.gif' style='width:50px; margin: 20px 275px'></img>");
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

    var timeZoneUrlTpl = "https://maps.googleapis.com/maps/api/timezone/json?key=" + API_KEY + "&location={{LAT}},{{LON}}&timestamp={{MILLIS}}";
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


    function manipulateImage(image, millis, lat, lon, callback) {
        var utcDate  = new Date(0);
        utcDate.setUTCSeconds(millis);
        var hour = utcDate.getHours();
        //console.log("millis: " + millis);
        //console.log("hour: " + hour);
        var month = utcDate.getMonth() + 1;
        var timeZoneUrl = timeZoneUrlTpl
                .replace("{{LAT}}", lat)
                .replace("{{LON}}", lon)
                .replace("{{MILLIS}}", millis);


        // TODO : account for some hours that are skipped in data
        var myurl = "http://localhost:8000/weather/" + lat +"/" + lon + "/"+ millis;


        var contrast = 0;
        if (Math.floor(lat)==41 && Math.floor(lon)==-71 && precip > 0) {
            contrast = -15;
        } else {
            contrast = 10;
        }

        getTimezoneJSON(timeZoneUrl, function(data) {
            //console.log(timeZoneUrl);
            //console.log(data);
            var hourOffset = data.rawOffset / 60 / 60;
            var localHour = ( hour + hourOffset + 24 ) % 24;
            //console.log("localHour: " + localHour)
            //var localHour  = 20;
            //console.log(hourOffset);
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
                weather = "normal"
                $(image).attr("data-weather", weather);
                $(image).attr("data-lat", lat);
                $(image).attr("data-lon", lon);
                // $(image).attr("data-saturation", saturation);
                // $(image).attr("data-exposure", exposure);
                // $(image).attr("data-contrast", contrast);
                $(image).attr("data-hour", hour);
                //$(image).attr("data-localHour", localHour);
                //$(image).attr('data-id', id);
                // if (id == 'pano0'){
                //     switch(weather){
                //         case 'rain':
                //             changeWeather('rain', animate, audio)
                //             break;
                //         case 'snow':
                //             changeWeather('snow', animate, audio)
                //             break;
                //     }
                // }

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
                    //$(newImage).attr("data-millis", $(image).attr("data-millis"));
                    $(newImage).attr("data-lat", $(image).attr("data-lat"));
                    $(newImage).attr("data-lon", $(image).attr("data-lon"));
                    // $(newImage).attr("data-saturation", $(image).attr("data-saturation"));
                    // $(newImage).attr("data-exposure", $(image).attr("data-exposure"));
                    $(newImage).attr("data-hour", $(image).attr("data-hour"));
                    $(newImage).attr("data-localHour", $(image).attr("data-localHour"));
                    $(newImage).attr("data-weather", $(image).attr("data-weather"));
                    $(newImage).attr("route-id", $(image).attr("route-id"));
                    //console.log(localHour);
                    return caman.pipeline(function () {
                        //this.saturation(saturation);
                        //this.exposure(exposure);
                        //this.contrast(contrast);
                        if (weather != 'normal' && localHour < 12) this.vibrance(-100);//this.contrast(100); this.sepia(100);
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
        console.log('getDate')
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
        console.log('getCurrPeriodDate')
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
        console.log('startRewind')
        initializeEvents();
        period = getCurrPeriod($("input[name='length']:checked").attr("value"), start_date)
        processPeriod(period, "next")
    }

    routes_for_the_day = []
    function processPeriod(period, direction){
        console.log('processPeriod')
        //an array of all the routes
        imageIndex = 0;
        routes_for_the_day = pullRoutesfromLocs(period, 1);

        //Make the current date the date of the route
        //currday = moment.unix(routes_for_the_day[0][2])

        currday = routes_for_the_day[0][0].date;
        var tmp = currday.replace('-','/');
        $("#route-date").text(tmp);

        processLocations(routes_for_the_day);
    }

    function getGRouteResponse(){
        getGRouteDfd = $.Deferred();
        //routes_for_the_day.pop();
        var routesLen = routes_for_the_day.length;

         routes_for_the_day.forEach(function(route, i){
            var routes = [route];
            var gResults = [];
            getGoogleRoute(routes, gResults, 0, function(){
                //there is some bugs with the route selection for sure
                if (routes[0][0] == undefined){
                    routesLen -= 1;
                    return;
                }
                var tmp_gResults =({
                    response: gResults[0],
                    timestamp: routes[0][0]['millis'],
                    lat: routes[0][0]['latitude'],
                    lon: routes[0][0]['longitude']
                })
                GRouteResponse.push(tmp_gResults);
                // console.log(routes_for_the_day.length); //total number of routes for the selected day
                // console.log(GRouteResponse.length);
                $("#loading-box").html("Loading route " + GRouteResponse.length + " of " + routesLen + "...");
                console.log(tmp_gResults);
                if (GRouteResponse.length == routesLen){
                    //sort all the routes based on timestamps
                    GRouteResponse.sort(function(a, b){
                        return parseInt(a.timestamp) - parseInt(b.timestamp);
                    })
                    getGRouteDfd.resolve(GRouteResponse);
                    
                }
            })
        })
         return getGRouteDfd;
    }


    function processCalendar(date_text){
        currday = moment(date_text)
        period = getCurrPeriod($("input[name='length']:checked").attr("value"), currday)
        console.log('processCalendar')
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

//showing the first image of each route
    function processLocations(locations) {
        console.log(locations)
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


        //urls.forEach(function(url, i) {
            var questionHtml = questionHtmlTpl
                .replace("{{SRC}}", urls[0])
                .replace(/{{INDEX}}/g, "route" + 0)
                .replace("{{DATE}}", locations[0][0].date)
                .replace("{{LAT}}", locations[0][0].latitude)
                .replace("{{LON}}", locations[0][0].longitude)
                .replace("{{MILLIS}}", locations[0][0].millis)
                .replace(/{{NUM}}/g, 0)
                //.replace("{{LOCMETA}}", "" + location.pickType + (location.homeDist * 1000).toFixed(0));

            questionsHtml += questionHtml;
        //});

        var $resDiv = $("#question-list");
        questionsHtml = "<canvas id='rainLayer' width='" + panosize.toString() + "' height='" + panosize.toString() + "' style='margin-top: -55px; position: absolute;z-index:100; display: none'></canvas>"
        + "<canvas id='snowLayer' width='" + panosize.toString() + "' height='" + panosize.toString() + "' style='margin-top: -55px; position: absolute;z-index:100; display: none'></canvas>"
        + "<img class='play-icon' src='img/play.png' style='position:absolute; top:0px; left:0px; width:100px; margin:40% 40%;'>"
        + questionsHtml;
        $resDiv.html(questionsHtml);
        console.log($resDiv)
        //render precipitation
        renderPrec('rain');
        renderPrec('snow');

        //adding rain audio
        audio = document.createElement('audio');
        source = document.createElement('source');
        source.src = './audio/rain.mp3';
        audio.appendChild(source);
        audio.loop = true;
        //nextButtonEvent(urls, animate, audio);
        //backButtonEvent(urls, animate, audio);
        $(".image-pano > img.location").each(function() {
            var millis = $(this).attr("data-millis");
            var lat = $(this).attr("data-lat");
            var lon = $(this).attr("data-lon");
            var id = $(this).attr('data-id');
            var date = $(this).attr("data-date")
            //console.log($(this).attr('data-date'));
            this.onload = function() {
                manipulateImage(this, millis, lat, lon);
                //manipulateImage(this, millis, lat, lon, id);
            };
        })

        $(".location-questions").each(function() {
            $(this).hide();
        });

        $("#route0").show();
        $("#route0").addClass('active')

        //buttonValidity(imageIndex, routes_for_the_day.length);

        $(".play-icon").click(function() {
            console.log('play icon hit')

            $("#loading-box").html("Loading Rewind...");
            $("#loading-box").visible();
            $("#loading-box").css("display", "-webkit-flex");
            $("#loading-box").css( "zIndex", 998 )
            console.log($("#loading-box").html())
            $(".play-icon").hide();


            var gRoutePromise;

            $('.active').find('.image-pano').each(function(){
                $(this).addClass('loading-hyperlapse');
            })
            var $img = $('.active').find('.image-pano').find(".location");

            window.modifyHyperlapseImages = function(image, millis, lat, lon, callback) {
                manipulateImage(image, millis, lat, lon, callback);
            };
            var hi = getGRouteResponse();

            console.log('getGRouteResponse')
            //how to use promise to do this?
            hi.done(function(){createHyperlapse($img.nextAll(".hyperlapse")[0])});

            console.log('getGRouteResponse2')
            //hi.then(createHyperlapse($img.nextAll(".hyperlapse")[0]))

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
        console.log(location)
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



    function initializeEvents(){
    //$("#nextButton").visible();
    //$("#backButton").visible();
    // nextButtonEvent();
    // backButtonEvent();

    $(".length-radio").on("change", function(){
        //buttonValidity();
        period = getCurrPeriod($("input[name='length']:checked").attr("value"), currday);
        processPeriod(period);

        $("#image-wrapper").html("<img src='img/loading.gif' style='width:50px; margin: 20px 275px'></img>");
    });
}



function plBttnOff(){
    $("#playButton").off();        
    $("#playButton").invisible();
}


});
