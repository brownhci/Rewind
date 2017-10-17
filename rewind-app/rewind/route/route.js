const fs = require('fs'),
	__ = require('underscore'),
	prompt = require('prompt'),
	moment = require('moment'),
	async = require('async');

var upper, lower,
	sevenDays = [];
	possibleLocs = [];
	finalLocs = [];
	routes = [];

var obj = JSON.parse(fs.readFileSync('./history.json', 'utf8'));
let arr = __(obj).toArray();

async.waterfall([
	_gettingInput,
	_filterArr,
	_getPossiblePlaces,
	_getLocs,
	_createRoutes
], function(error, success){
	if (error) {alert (error);}
	return
})

// ahhh be careful, no sanity check here for user input
function _gettingInput(callback){
	var time = {};
	prompt.start();
	prompt.addProperties(time, ['year', 'month', 'date'], function(err, rst){
		console.log('our year and month is now set as: ');
		console.log(' year: ' + rst.year);
		console.log(' month: ' + rst.month);
		console.log(' date: ' + rst.date)
		console.dir(time)
		lower = moment.utc(moment(new Date(time.year, parseInt(time.month) - 1, parseInt(time.date)))).valueOf();
		upper = moment.utc(moment(new Date(time.year, parseInt(time.month) - 1, parseInt(time.date) + 1))).valueOf();
		callback(null);
	})
}

// getting data for the specified ranges
function _filterArr(callback){
	sevenDays = __.filter(arr[0], function(item){ // sevenDays is list of all elements in our selected time period
		return parseInt(item['timestampMs']) >= parseInt(lower) && parseInt(item['timestampMs']) <= parseInt(upper)
	});

	sevenDays = __.each(sevenDays, function(item){
		item['timestampMs'] = parseInt(item['timestampMs'])
		item['latitudeE7'] = parseFloat(item['latitudeE7']/ 1e7);
		item['longitudeE7'] = parseFloat(item['longitudeE7'] / 1e7)
	});
	sevenDays.reverse();
	lat1 = sevenDays[0]['latitudeE7'];
	lon1 = sevenDays[0]['longitudeE7'];
	lat2 = sevenDays[0]['latitudeE7'];
	lon2 = sevenDays[0]['longitudeE7'];
	lat3 = sevenDays[1]['latitudeE7'];
	lon3 = sevenDays[1]['longitudeE7'];
	dist = haversineDist(lat2, lon2, lat3, lon3);
	time1 = parseInt(sevenDays[0]['timestampMs']);
	time2 = parseInt(sevenDays[1]['timestampMs']);
	callback(null);
}

/* gets all places with a time threshold of greater than 15 min */
function _getPossiblePlaces(callback){
	for (i = 0; i < sevenDays.length-1; i++) {
		possible_place = findPlaces(i, i+1, 900000, 1);
		if (possible_place) {
			possibleLocs.push(i+1);
		}
	}
	console.log(possibleLocs);

	callback(null);
}


/* takes in two locations and sees if it fits the time threshold, helper function for _getPossiblePlaces */ 

// todo: use distance instead of time
function findPlaces(loc_1, loc_2, time_threshold, velocity_threshold){
	lat1 = sevenDays[loc_1]['latitudeE7'];
	lon1 = sevenDays[loc_1]['longitudeE7'];
	lat2 = sevenDays[loc_2]['latitudeE7'];
	lon2 = sevenDays[loc_2]['longitudeE7'];
	//console.log(haversineDist(lat1, lon1, lat2, lon2));
	dist = haversineDist(lat1, lon1, lat2, lon2);
	time1 = parseInt(sevenDays[loc_1]['timestampMs']);
	time2 = parseInt(sevenDays[loc_2]['timestampMs']);
	velocity = getVelocity(dist, time1, time2);
	time_diff = time2 - time1;
	if (time_diff > time_threshold) {
		if (velocity < velocity_threshold) {
			return true;
		}
	}
	else {
		return false;
	}
}


/* cleans up location list */
// add location check
function _getLocs(callback) {
	finalLocs.push(possibleLocs[0])
	pointer1 = 0
	pointer2 = 1
	while (pointer2 < possibleLocs.length) {
		loc1 = possibleLocs[pointer1]
		loc2 = possibleLocs[pointer2]
		if (loc1 == loc2-1) {
			pointer1 = pointer2;
			pointer2 = pointer2 + 1
		}
		else {
			finalLocs.push(possibleLocs[pointer2]);
			pointer1 = pointer2;
			pointer2 = pointer2 + 1;
		}
	}
	console.log(finalLocs);
	for (i=0; i < finalLocs.length; i++) {
		//console.log(sevenDays[finalLocs[i]]);
		console.log(sevenDays)
	}
	callback(null);
}


function _createRoutes(callback) {
	pointer1 = 0
	pointer2 = 1
	arr_pointer = 0
	while (pointer2 < finalLocs.length) {
		new_list = [];
		for (i = finalLocs[pointer1]+1; i < finalLocs[pointer2]; i++) {
			new_list.push(i);
		}
		arr_pointer = arr_pointer + 1;
		pointer1 = pointer2;
		pointer2 = pointer2 + 1;
		routes.push(new_list);
	}
	console.log(routes);
	callback(null, 'done');
}





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
	return dist / ((time2 - time1) / 1000)
}











// rudimentary, checks only three points. eventually i think we should be checking multiple sets of three points for each possible location point
// wait but even if you do the threepointcheck thats assuming the first point is a location, how can you tell?
function threePointCheck(index) {
	lat1 = sevenDays[index]['latitudeE7'];
	lon1 = sevenDays[index]['longitudeE7'];
	lat2 = sevenDays[index+1]['latitudeE7'];
	lon2 = sevenDays[index+1]['longitudeE7'];
	lat3 = sevenDays[index+2]['latitudeE7'];
	lon3 = sevenDays[index+2]['longitudeE7'];
	dist1 = haversineDist(lat1, lon1, lat2, lon2); // need to incorporate some sort of angle measurement
	dist2 = haversineDist(lat2, lon2, lat3, lon3);
	if (dist1 > dist2) {
		return false
	}
	else {
		return true;
	}
}

/* gets distance between two points given their indices in sevenDays */
function getDist(index1, index2) {
	return haversineDist(sevenDays[index1]['latitudeE7'], sevenDays[index1]['longitudeE7'], sevenDays[index2]['latitudeE7'], sevenDays[index2]['longitudeE7']);
}

/*
get pairs of p1, pn where distance threshold is very little, and the timestamps are at least half an hour for each pair.
p1 can be identified as points where the distance between p1 and p0 is low and the velocity is super low as well. 
*/
/*function getPairs(){
	var list_pairs = [];
	for (i = 0; i < len(single_day)-1; i++) {
		loc_1 = single_day[i];
		loc_2 = single_day[i+1];
		lat1 = loc_1('latitudeE7');
		lon1 = loc_1('longitudeE7');
		lat2 = loc_2('latitudeE7');
		lon2 = loc_2('longitudeE7');
		dist = haversineDist(lat1, lon1, lat2, lon2);
		time_1 = parseInt(loc_1['timestampMs']);
		time_2 = parseInt(loc_2['timestampMs']);
		if (time_diff > 900000) {

		}
	}
}*/

/* takes in two indices 1 and n.
go through the recorded positions between p1 and pn. 
if distance is more than some threshold, discard it; or if velocity is ridiculously high, discard it. 
otherwise, return p1.
*/

/*
function _checkPossiblePlaces(callback){
	ret = []
	pointer1 = 0
	pointer2 = 1
	distance_threshold = 25

	while (pointer1 < possibleLocs.length) {
		loc1 = possibleLocs[pointer1]
		loc2 = possibleLocs[pointer2]

		if (getDist(loc1, loc2) < distance_threshold) {
			pointer2 = pointer2 + 1;
		}
		else {

		}
		if dist between pointer1 and pointer2 is not within threshold:
			check dist between pointer1 and pointer3
			if dist betweenp 1 and p3 is within threshold:
				move pointer to p4
			else:
				ret.add pointer1
				pointer1 = pointer2
	}


	for (i = 0; i < possibleLocs.length; i++) {
		pointer = i
		while possibleLocs[i+pointer]
		if (threePointCheckForPossibleLocs(index)==true) {
			true_locs.push(index)
			//true_locs.push(sevenDays[index]);
		}
	}
}
*/
