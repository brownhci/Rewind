var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var weather = require('./routes/weather');

var app = express();
app.use(morgan('dev')); /* 'default','short','tiny','dev' */
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json());


app.use('', express.static('./rewind-app/rewind'));
app.get('/weather', weather.findAll);
app.get('/weather/:lat/:lng/:millis', weather.findThis);


app.listen(8000);
console.log('Listening on port 8000...');
