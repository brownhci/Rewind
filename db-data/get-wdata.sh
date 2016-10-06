#!/bin/bash

#download providence data from 2012 - 2016
#create ./routes/seed.json to be used in mongodb
#more data information in process.py
for i in {2..6}; do
	wget "http://www1.ncdc.noaa.gov/pub/data/noaa/201$i/725070-14765-201$i.gz" 
	gunzip "725070-14765-201$i.gz" 
	cat "725070-14765-201$i" >> merge 
	rm "725070-14765-201$i"
done

python process.py -i merge -o seed.json 
cp seed.json ../routes/seed.json
rm seed.json 
rm merge
