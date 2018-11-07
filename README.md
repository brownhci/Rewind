# Rewind

## Install and Run locally

If you'd like to see weather effects on Rewind, click [here](#with-weather-effects). Otherwise click [here](#without-weather-effects).

### With weather effects

The following instruction assumes that ```npm```, ```nodejs``` and ```mongodb``` have been installed locally. Please refer to the following websites if they are not:

[npm and nodejs](https://nodejs.org/en/download/package-manager/)

[mongodb](https://docs.mongodb.com/manual/administration/install-community/)

To create weather data for the database, go to ```db-data/```, and run ```./get-wdata.sh```. This will generate ```seed.json``` in the ```routes/``` directory for the weather database. Currently only Providence area data (2012 - 2016) are included.

If you are using a mac and homebrew is installed, start the database using ```brew services start mongodb```, and using ```brew services stop mongodb``` to stop it. 
Otherwise please refer to [Install Mongodb](https://docs.mongodb.com/manual/administration/install-community/) for more details on how to start up mongodb on local machines.


Run ```npm install``` from the root to install required dependencies and run ```node server.js``` to rewind at ```localhost:8000```


### Without weather effects

The app can still be run without a server and database if you don't care about weather effects. You can open up the app with ```index.html``` located at ```rewind-app/rewind/```. Note that the app would still try to search for a database, and would output some connection failing errors in the console. These errors will be eliminated or kept at a minimal level in future updates.

