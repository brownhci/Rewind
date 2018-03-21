//route determination
//determine route based on velocity and distance
function makePoint(lat, lon, time, v, dist){
    var point = {
        'latitude': lat,
        'longitude': lon,
        'millis': time,
        'date':  moment.unix(time).format('YYYY-MM-DD'),
        'velocity': v,
        'dist': dist
    }

    return point;
}

function pullRoutesfromLocs(period, num_routes){
    var routes = [];
    var tmp = [];
    var v_index = 3;


    //if there are less than four data points in the current period
    //return an empty routes
    if (period.length < 4){
        return routes
        console.log("less than 4 data points")
    }

    var prev = 0, cur = 1;
    var curRoute = [];
    while (cur < period.length) {
        var point = [];

        var prevLat = period[prev].latitude,
            prevLon = period[prev].longitude;
            prevTime = period[prev].millis;
        var curLat = period[cur].latitude;
            curLon = period[cur].longitude;
            curTime = period[cur].millis;

        var dist = haversineDist(prevLat, prevLon, curLat, curLon);
        var v = getVelocity(dist, prevTime, curTime);

        if (v < 0.5){
            console.log('speed less than 1.5')
            //check if previous speed is also extremely slow, if it is
            //the criteria here needs to be more stringent
            if (tmp.length > 0){


                if (tmp.length == 1) {
                    if (cur == period.length-1) {
                        console.log('end reached')
                        point = makePoint(prevLat, prevLon, prevTime, v, dist)
                        tmp.push(point);
                        routes.push(tmp);
                    }
                }
                //if the previous speed is also very slow
                //point belongs to a static cluster
                //console.log(tmp[tmp.length - 1]);
                if (tmp[tmp.length - 1].velocity < 1.5){
                    // point.push(prevLat, prevLon, prevTime, v, dist);
                    // tmp.push(point);
                    cur ++;
                    prev ++;
                    continue;

                //otherwise this is the end of the route
                }else{
                    point = makePoint(prevLat, prevLon, prevTime, v, dist)
                    tmp.push(point);
                    routes.push(tmp);
                    //tmp = [];
                }
            //if it is the first point with speed < 1.5, store it
            }

            else{
                point = makePoint(prevLat, prevLon, prevTime, v, dist);
                console.log(point)
                tmp.push(point);
                console.log(tmp)
            }

        //if v > 1.5 -> in motion
        }



        else {
            console.log('v > 0.5')

            if (tmp.length > 0){
                if (tmp[tmp.length - 1].velocity < 0.5){
                    lastElement = tmp[tmp.length - 1];
                    tmp = [];
                    tmp.push(lastElement);
                    console.log('last element pushed:')
                    console.log(lastElement)
                }
            }
                point = makePoint(prevLat, prevLon, prevTime, v, dist);
                console.log(point)
                tmp.push(point);
                console.log(tmp)
                console.log('check 4')
        }

        
        cur ++;
        prev ++;
    }
    console.log(routes);
    if (routes.length==0) {
        routes.push(tmp);
    }
    console.log(routes);
    return routes;
}


//route finding using Google Direction Service
//@
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
    if (locations.length > 20){
        locations = locations.slice(0, 21)
    }

    directions_service = new google.maps.DirectionsService();

    var routeRequest = {
        origin: googleLatLng(first),
        destination: googleLatLng(last),
        waypoints: _(locations).map(function(location) {
            return {
                location: googleLatLng(location)
            };
        }),
        travelMode: google.maps.DirectionsTravelMode.DRIVING
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




function googleLatLng(location) {
	return new google.maps.LatLng(location.latitude, location.longitude);
}


//Taken from http://www.movable-type.co.uk/scripts/latlong.html
//calculate the shortest distance between two geopoints
function haversineDist (lat1, lon1, lat2, lon2){
	// console.log(lat1, lon1, lat2, lon2);
	lat1 = parseFloat(lat1);
	lat2 = parseFloat(lat2);
	lon1 = parseFloat(lon1);
	lon2 = parseFloat(lon2);

	var R = 6371e3;
	var phi1 = lat1.toRadians();
	var phi2 = lat2.toRadians();
	var deltaPhi = (lat2 - lat1).toRadians();
	var deltaLamda = (lon2 - lon1).toRadians();
	var a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
       		Math.cos(phi1) * Math.cos(phi2) *
        	Math.sin(deltaLamda/2) * Math.sin(deltaLamda/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = R * c;
	return d;
}

Number.prototype.toRadians = function() {
	return this * (Math.PI/180)
}

function getVelocity (dist, time1, time2){
	return dist / (time2 - time1)
}
