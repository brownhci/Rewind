#!/usr/bin/python

import csv
import re
import json
import datetime
import sys, getopt

'''
TO USE: python process.py <weather-file>
will output to seed.json

modified from decode.py by April Tran

decodes noaa files
docs at http://www1.ncdc.noaa.gov/pub/data/noaa/ish-format-document.pdf

list of station ids used (retrieved from http://www1.ncdc.noaa.gov/pub/data/noaa/isd-history.txt):

USAF   WBAN  STATION NAME                  CTRY ST CALL  LAT     LON      ELEV(M) BEGIN    END
997278 99999 PROVIDENCE                    US   RI       +41.800 -071.400 +0010.0 20050104 20160815
994971 99999 BOSTON                        US   MA       +42.350 -071.050 +0000.0 20060403 20160815
725053 94728 CENTRAL PARK                  US   NY KNYC  +40.789 -073.967 +0039.6 20120801 20160816
997338 99999 CHICAGO                       US   IL       +42.000 -087.500 +0202.0 20050322 20160815
994035 99999 LOS ANGELES                   US   CA       +33.720 -118.272 +0002.0 20050419 20160815
994016 99999 SAN FRANCISCO                 US   CA       +37.807 -122.465 +0002.0 20050419 20160815

712650 99999 TORONTO CITY CENTRE           CA      CYTZ  +43.617 -079.383 +0076.5 19790507 20160815
711830 99999 MONTREAL/PIERRE ELLIOTT TRUDE CA      CWTQ  +45.467 -073.733 +0032.0 19910118 20160815
712010 99999 VANCOUVER HARBOUR CS  BC      CA      CWHC  +49.283 -123.117 +0003.0 19800301 20160815
713930 99999 CALGARY INTL CS               CA            +51.100 -114.000 +1081.0 20040921 20160815


//////////////////////////////////
INPUT:
station identifier: 
(FIXED-WEATHER-STATION USAF MASTER STATION CATALOG)
POS 5 - 10


date:
POS 16 - 23
MIN: 00000101 
MAX: 99991231
DOM: A general domain comprised of integer values 0-9 in the format YYYYMMDD.
YYYY can be any positive integer value; MM is restricted to values 01-12; and DD is restricted to values 01-31.


time:
POS 24 - 27
Based on UTC
MIN: 0000 
MAX: 2359
DOM: A general domain comprised of integer values 0-9 in the format HHMM.
HH is restricted to values 00-23; MM is restricted to values 00-59


latitude coordinate:
POS 29 - 34
GEOPHYSICAL-POINT-OBSERVATION latitude coordinate
The latitude coordinate of a GEOPHYSICAL-POINT-OBSERVATION where southern hemisphere is negative.
MIN: -90000 
MAX: +90000
UNITS: Angular Degrees
SCALING FACTOR: 1000
DOM: A general domain comprised of the numeric characters (0-9), a plus sign (+), and a minus sign (-).
+99999 = Missing


longitude coordinate:
POS 35 - 41
The longitude coordinate of a GEOPHYSICAL-POINT-OBSERVATION where values west from
000000 to 179999 are signed negative.
MIN: -179999 
MAX: +180000 UNITS: 
Angular Degrees
SCALING FACTOR: 1000
DOM: A general domain comprised of the numeric characters (0-9), a plus sign (+), and a minus sign (-).
+999999 = Missing


air temperature:
POS 88 - 92
MIN: -0932 
MAX: +0618 
UNITS: Degrees Celsius
SCALING FACTOR: 10


precipitation:
AA1 - AA4 
FLD LEN: 3 (identifier)
FLD LEN: 2 (period quantity in hours 00 - 98 / hours)
FLD LEN: 4 (depth dimension, 0000 - 9998 / millimeters)

(snow determination - precipitation + air temperature)

sky cover summation (cloudiness):
GD1 - GD6
FLD LEN 3 (identifier)
FLD LEN 1 celestial dome covered by all layers of clouds
0: Clear - No coverage
1: FEW - 2/8 or less coverage (not including zero)
2: SCATTERED - 3/8-4/8 coverage
3: BROKEN - 5/8-7/8 coverage
4: OVERCAST - 8/8 coverage
5: OBSCURED
6: PARTIALLY OBSCURED
9: MISSING
/////////////////////////////////
OUTPUT:

a JSON object

'''
cloudiness_descript = {
	"0" : "clear",
	"1" : "few",
	"2" : "scattered",
	"3" : "broken",
	"4" : "overcast",
	"5" : "obscured",
	"6" : "partially obscured",
	"9" : "missing"
}


epoch = datetime.datetime.utcfromtimestamp(0)


def get_prec (line):
	match = re.search(r'AA1', line)
	rec_hour, prec = None, None

	if match is not None:
		matched = re.search(r'AA1(\d{6})', line).group()
		rec_hour = int(matched [3 : 5])
		prec = int(matched[5 : ])

	data = {
		"hourRecorded" : rec_hour,
		"precipitation": prec
	}

	return data


def get_cloudiness (line):
	match = re.search(r'GD\d', line)
	rst = []
	if match is not None:
		matched_list = re.findall(r'GD(\d{2})', line)
		matched_list = sorted(matched_list)
		for index, item in enumerate(matched_list):
			data = {
				'id' : index + 1,
				'value': int(item [1 : 2]),
				'description': cloudiness_descript[item [1 : 2]]
			}
			rst.append(data)
	
	return rst

def unix_time_millis(dt):
    return (dt - epoch).total_seconds() * 1000.0


def main(argv):
	input_file = ''
	output_file = ''
	try:
		opts, args = getopt.getopt(argv,"hi:o:",["ifile=","ofile="])
	except getopt.GetoptError:
		print 'process.py -i <inputfile> -o <outputfile>'
		sys.exit(2)
	for opt, arg in opts:
		if opt == '-h':
			print 'test.py -i <inputfile> -o <outputfile>'
			sys.exit()
		elif opt in ("-i", "--ifile"):
			input_file = arg
		elif opt in ("-o", "--ofile"):
			output_file = arg

	input_open = open (input_file, 'rb')
	output_open = open (output_file, 'w')

	rst = []

	for line in input_open:
		date = line [15 : 23]
		time = line [23 : 27]
		timestamp = datetime.datetime(int(date[:4]), int(date[4:6]), int(date[6:8]), int(time[:2]), int(time[2:4]))
		timestamp = unix_time_millis(timestamp)
		lat = float (line [28 : 34]) / 1000
		lng = float (line [34 : 41]) / 1000
		temp = float (line [87 : 92]) / 10
		temp = temp if temp != 999.9 else None
		prec = get_prec (line)
		snow = True if (temp < 0 and prec['precipitation'] > 0) else False
		cloudiness = get_cloudiness (line)
		data = {
	    	'loc' : [ lat, lng ],
			'timestamp': timestamp,
			'temperature' : temp,
			'precipitation' : prec,
			'cloudiness' : cloudiness,
			'snow' : snow
		}
		rst.append(data)

	json.dump(rst, output_open)

if __name__ == "__main__":
   main(sys.argv[1:])
