function getNumDays(days){
    num_days = 0
    for(var d in days){
        num_days ++;
    }
    return num_days
}

function getEarliestDay(days){
    earliest = moment();
    for(var d in days){
        day = moment(d);
        if(day.isBefore(earliest)){
            earliest = day;
        }
    }
    return earliest
}

function getLastDay(days){
    last = moment.unix(0);
    for(var d in days){
        var day = moment(d);
        if(day.isAfter(last)){
            last = day;
        }
    }

    return last;
}

function getMissingDays(days){
    //Returns a set of missing dates in the calendar (JS Date format)
    //This will be used one time to format the calendar on initialization
    //(So that users can't click these dates)
    missing = new Set();
    start = getEarliestDay(days);
    end = getLastDay(days);

    while(start.isBefore(end)){
        start.add(1, 'days')
        if(!days[momentToDate(start)]){
            missing.add(momentToDate(start));
        }
    }
    return missing;
}



    
//Converts a moment.js to "YYYY-MM-DD" format
function momentToDate(day){
    temp_day = moment(day)
    datestring = temp_day.get("year") + "-"
    month = parseInt(temp_day.get("month")) + 1
    if(month < 10){
        month = "0" + month;
    }
    date = parseInt(temp_day.get("date"))
    if(date < 10){
        date = "0"+date;
    }
    datestring += month + "-" + date
    return datestring
}


function getMonth(dateString) {
    return dateString.split("-")[1];
}

function getDate(dateString) {
    return dateString.split("-")[2];
}
