var Caman = require('caman');

function getWeather(url, callback) {
    $.getJSON(url)
        .done(function( data ){
            if (data.snow == true){
                weather = 'snow';
            }else if (data.precipitation.precipitation > 0){
                weather = 'rain';
            }else {
                data.cloudiness.forEach(function(condition){
                    if(condition.value > 2){
                        weather = 'cloudy';
                    }
                });
            }
            callback(weather);
        })//still show connection errors in the console
        .error (function( jqxhr, textstatus, error){
            callback('normal');
        });
}



function renderPrec(type) {
    //type is either rain or snow
    var globalAlpha = type == "rain" ? 0.1 : 0.3;
    var rectWidth = type == "rain" ? 1 : 3;
    var rectHeight = type == "rain" ? 10 : 3;

    var canvas = document.getElementById(type + "Layer");
    var ctx = canvas.getContext('2d');
    canvas.width = 640
    canvas.height = 640
    ctx.globalAlpha = globalAlpha;
    var n = 0;

    while (n < 20000){
        var i = Math.floor(Math.random()* 640)
        var j = Math.floor(Math.random()* 640)
        var num = 255
        ctx.fillStyle = "rgba(" + num + "," + num + "," + num + "," + 0.8 + ")";
        ctx.fillRect(i, j, rectWidth, rectHeight);
        n += 1
    }
}


//decide how the weather is changed
function changeHues(img, weather, season, hour) {
    var ctx = img.getContext('2d');
    var imageData = ctx.getImageData(0,0, img.width, img.height);
    var data = imageData.data;
    //approximated land area
    var land = 640 / 1.6 ;

    for (var i = 0; i < data.length; i += 4) {
        var height = Math.floor((i / 4) / 620)
        var color = [data[i], data[i+1], data[i+2]];
        var ref = Caman.Color.rgbToHSV(data[i], data[i+1], data[i+2])
        var winter = false;

        switch (season){
            case ("winter"):
                color = winterify(ref[0], ref[1], ref[2]);
                break;
            case("spring"):
                color = springify(ref[0], ref[1], ref[2]);
                break;
            case("summer"):
                color = summerify(ref[0], ref[1], ref[2]);
                break;
            case("fall"):
                color = fallify(ref[0], ref[1], ref[2]);
                break;
        }


        if (weather != 'normal') {
            if (ref[0] >= 0.5 && ref[0] <= 0.85) {
                color = saturate(color[0], color[1], color[2], -80); 
            }
        }else{
            if (hour >= 19) color = renderAfternoon(color[0], color[1], color[2], i, height, land);
        }

        data[i] = color[0];
        data[i+1] = color[1];
        data[i+2] = color[2];

    }
    ctx.putImageData(imageData, 0, 0);
}

//hand picked hsv vals
//only desaturate and brighten up snow areas - this is what the flag is for
function winterify(h, s, v){

    var flag = false;
     if ((h >= 0.11  && h <= 0.20) && (s > 0.3)){
        h -= 0.11;   
        s -= 0.1
        v += 0.2
        flag = true;

    }

     if ((h >= 0.2  && h <= 0.30) && (s> 0.3)) {
        h -= 0.15; 
        s -= 0.1
        v += 0.2
        flag = true;
    }

    if ((h >= 0.3  && h <= 0.42) && (s > 0.3)){ 
        h -= 0.25; 
        s -= 0.1
        v += 0.2
        flag = true
    }

    var color = Caman.Color.hsvToRGB(h, s, v) 

    if (flag == true ){
        color = saturate(color[0], color[1], color[2], -80)
        color = brightness(color[0], color[1], color[2], 10)
        flag = false;
    }

    return color
}

//hand picked hsv values...
function springify(h, s, v){
    if ((h <= 0.15 && s >= 0.5 && v >= 0.5)){
        h += 0.05
        s -= 0.2
        v -= 0.2
    }
    if ((h >= 0.11  && h <= 0.20) && (s > 0.3)){
        s += 0.3;
        v += 0.1;
    }

    if ((h > 0.2 && h <= 0.3) && (s > 0.2)){ 
        h -= 0.05;
        s += 0.2;
        v += 0.05;
    }
    if ((h > 0.3 && h <=0.42) && (s > 0.2)){
        h -= 0.15
        s += 0.15;
        v += 0.05;
    }

    color = Caman.Color.hsvToRGB(h, s, v) 
    return color
}

//hand picked hsv again..
function summerify(h, s, v){
    if ((h <= 0.15 && s >= 0.5 && v >= 0.5)){
        h += 0.05
        s -= 0.2
        v -= 0.2
    }

    if (((h >= 0.11 && h <= 0.20) && (s > 0.3)) 
                        || ((h > 0.2 && h <= 0.3) && (s > 0.2))){
     
        h -= 0.1
        s += 0.1
        v -= 0.1
    }
    color = Caman.Color.hsvToRGB(h, s, v) 
    color[0] -= 10
    color[1] -= 10
    return color
}


//more hand picked hsvs
function fallify(h, s, v){
    if ((h >= 0.11  && h <= 0.20) && (s > 0.3)){
        h += 0.1; 
        s += 0.2;
        v += 0.1;
    }
    if ((h > 0.2 && h <= 0.3) && (s > 0.2)){ 
        h = 0.1;
        s += 0.2;
        v += 0.1;
    }
    if ((h > 0.3 && h <=0.42) && (s > 0.2)){
      h -= 0.2
      s += 0.2;
      v += 0.1;
    }

    color = Caman.Color.hsvToRGB(h, s, v) 
    color[0] -= 10
    color[1] -= 10
    color[2] -= 5
    return color
}

// hand picked rgbs..
function renderAfternoon(r, g, b, i, height, land){
    var color = saturate(r, g, b, 20);
     if ((r > 65 && g > 110 && b > 110) ){
          color[0] += 40;
          color[2] -= 10

    color = brightness(color[0], color[1], color[2], Math.min(-10, -0.3 * Math.abs(land - height)));
    
    }else{

        color = brightness(color[0], color[1], color[2], Math.min(-10, -0.3 * Math.abs(land - height)));
        color = saturate(color[0], color[1], color[2], Math.max(-5, -0.1 * Math.abs(land - height)));
    }

    color[0] += 10;
    color[1] += 10;

    return color;
}

// more handpicked rgbs
function renderNight (r, g, b, i, height, land){
    var color = saturate(r, g, b, -30);
    var height = Math.floor((i / 4) / 620);
    //estimated sky height
    if (height < land){
        //estimated sky 
        if ((color[0] > 80 && color[1] > 110 && color[2] > 110) ){
             //estimated cloud
             if ((color[0] > 180 && color[1] > 180 && color[2] > 180) ){
                color[0] -= 90;
                color[1] -= 90;
                color[2] -= 90;
            //none cloud
            }else{
                color[0] -= 70;
                color[1] -= 70;
                color[2] -= 70;
            }

        color = brightness(color[0], color[1], color[2], Math.min(-20, -0.15 * Math.abs(land - height)));
        //none sky in the approximated sky region
        }else{
            color[0] -= 50;
            color[1] -= 50;
            color[2] -= 50;
            color = brightness(color[0], color[1], color[2], Math.min(-20, -0.15 * Math.abs(land - height)));
        }
    //everything out of the sky region
    }else{
        color[0] -= 50;
        color[1] -= 50;
        color[2] -= 50;
        color = brightness(color[0], color[1], color[2], Math.min(-25))
    }


    return color
}


function changeWeather (curWeather, animate, audio){
    switch (curWeather){
        case 'rain':
            $('#rainLayer').show();
            audio.play();
            $('#snowLayer').hide();
            clearInterval(animate);
            animate = setInterval(function(){ renderPrec('rain') }, 100);
            break;
        case 'snow':
            $('#rainLayer').hide();
            audio.pause();
            $('#snowLayer').show();
            clearInterval(animate);
            animate = setInterval(function(){ renderPrec('snow') }, 400);
            break;
        case 'cloudy':
            $('#rainLayer').hide();
            audio.pause();
            $('#snowLayer').hide();
            clearInterval(animate);
            break;
        case 'normal':
            $('#rainLayer').hide();
            audio.pause();
            $('#snowLayer').hide();
            clearInterval(animate);
            break;
        }
}



//taken from Caman.js.
function saturate(r, g, b, adjust){
    adjust *= -0.01;
    var max;
    max = Math.max(r, g, b);
    if (r !== max) {
        r += (max - r) * adjust;
    }
    if (g !== max) {
        g += (max - g) * adjust;
    }
    if (b !== max) {
        b += (max - b) * adjust;
    }

    return [r, g, b];
}

function brightness (r, g, b, adjust){
  adjust = Math.floor(255 * (adjust / 100));
      r += adjust;
      g += adjust;
      b += adjust;
      return [r, g, b]
}