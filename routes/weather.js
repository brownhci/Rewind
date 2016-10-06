var mongo = require('mongodb');
var weatherData = require('./seed.json')

var Server = mongo.Server,
    Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('weatherdb', server);

db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'weatherdb' database");

        db.collection('weather', {strict:true}, function(err, collection) {
            if (err) {
                console.log("The 'weather' collection doesn't exist. Creating it with sample data...");
                populateDB();
            }else{
            	collection.deleteMany({});
            	populateDB();
            }
        });
    }
});

exports.findThis = function(req, res) {
    var lat = parseFloat(req.params.lat);
    var lng = parseFloat(req.params.lng);
    var epoch = parseInt(req.params.millis);

    db.collection('weather', function(err, collection) {
    	if (err){
    		throw err;
    	}else{
    	console.log(epoch)
    	collection.ensureIndex({loc: "2d"})
        collection.find(
        	{loc : {  
        		$near: [lat, lng],
          		$maxDistance: 999999999
        		},
        	 timestamp: {
        	 	$lte: epoch
        	 }
        	}).sort({timestamp: -1}).limit(1).toArray(function(err, item) {

            if (item == null) {
                res.send(404); 
            } else {
                res.send(200, item[0]);
            }
        });
}
});
};

exports.findAll = function(req, res) {
    db.collection('weather', function(err, collection) {
        collection.find().toArray(function(err, items) {
            res.send(items);
        });
    });
};


var populateDB = function() {
    db.collection('weather', function(err, collection) {
        collection.insert(weatherData, {safe:true}, function(err, result) {});
    });

};
