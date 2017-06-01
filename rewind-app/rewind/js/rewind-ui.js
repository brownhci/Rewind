//back and next button interactions
//We often turn on and off the clickability of these buttons, so here's a function that resets the event
var imageIndex = 0;

//Initializes click events (only happens one time)
function initializeEvents(){
    $("#nextButton").visible();
    $("#backButton").visible();
    nextButtonEvent();
    backButtonEvent();

    $(".length-radio").on("change", function(){
        buttonValidity();
        period = getCurrPeriod($("input[name='length']:checked").attr("value"), currday);
        processPeriod(period);
        $("#upload-wrapper").html("<img src='img/loading.gif' style='width:50px; margin: 20px 275px'></img>");
    });
}


function nextButtonEvent(urls, animate, audio){
    $("#nextButton").off("click");
    $("#nextButton").click(function() {
        $("div.hyperlapse").hide().find("*").remove();      
         $("img.location, canvas.location").show().parent().removeClass("loading-hyperlapse");      
    
         $("#backButton").visible();        
         if (imageIndex < urls.length - 1) {        
             $("#route" + imageIndex).hide();       
             imageIndex++;      
         }      
         if (imageIndex == urls.length - 1) {       
             $("#nextButton").invisible();      
         }      
         $("#route" + imageIndex).show();       
         $("#route" + (imageIndex - 1)).removeClass('active')       
         $("#route" + imageIndex).addClass('active')        
         $(".play-icon").css("display","");     
    
         var $img = $("#route" + imageIndex + ">" + ".image-pano").find(".location");       
         var cur_weather = $img[0].attributes[11].value;        
         changeWeather(cur_weather, animate, audio);        
         $("#playButton").off();        
         $("#playButton").invisible();
    });
}


function backButtonEvent(urls, animate, audio){
    $("#backButton").off("click")
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
         $("#route" + (imageIndex + 1)).hide();     
         $("#route" + (imageIndex + 1)).removeClass('active')       
         $("#route" + imageIndex).show();       
         $("#route" + imageIndex).addClass('active');       
         $(".play-icon").css("display","");     
         // console.log("Showing: #q" + imageIndex + " imageIndex: " + imageIndex + " imageCount: " + urls.length);     
         var $img = $("#route" + imageIndex + ">" + ".image-pano").find(".location");       
         var cur_weather = $img[0].attributes[11].value;           
        changeWeather(cur_weather, animate, audio);       
        $("#playButton").off();     
        $("#playButton").invisible();
    });
}
