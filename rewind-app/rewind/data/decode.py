import csv
import re

'''
TO USE: python decode.py <weather-file>
will output to clean.txt

decodes noaa files
docs at http://www1.ncdc.noaa.gov/pub/data/noaa/ish-format-document.pdf
weather currently determined by weather at tfgreen because providence 
tower doesn't record precipitation data

output:
chars 1-8 date YYYYMMDD
chars 9-12 time HHMM (military time)
chars 13-18 lat
chars 19-25 lon
char 26 precipitation (0=none, 4=heavy)

FILL IN BEGIN/END DATE TO FILTER DATA: inclusive YYYYMMDD


INPUT:
//////////////////////////////////
station identifier: 
(FIXED-WEATHER-STATION USAF MASTER STATION CATALOG)
POS 5 - 10

//////////////////////////////////
date:
POS 16 - 23
MIN: 00000101 
MAX: 99991231
DOM: A general domain comprised of integer values 0-9 in the format YYYYMMDD.
YYYY can be any positive integer value; MM is restricted to values 01-12; and DD is restricted to values 01-31.

//////////////////////////////////
time:
POS 24 - 27
Based on UTC
MIN: 0000 
MAX: 2359
DOM: A general domain comprised of integer values 0-9 in the format HHMM.
HH is restricted to values 00-23; MM is restricted to values 00-59

//////////////////////////////////
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

//////////////////////////////////
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

//////////////////////////////////
air temperature:
POS 88 - 92
MIN: -0932 
MAX: +0618 
UNITS: Degrees Celsius
SCALING FACTOR: 10

//////////////////////////////////
precipitation:
AA1 - AA4 
FLD LEN: 3 (identifier)
FLD LEN: 2 (period quantity in hours 00 - 98 / hours)
FLD LEN: 4 (depth dimension, 0000 - 9998 / millimeters)

(snow determination - precipitation + air temperature)
//////////////////////////////////
sky cover summation (cloudiness):
GD1 - GD6
FLD LEN 3 (identifiaer)
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

'''
begin_date = 20160227
end_date = 20160306

with open('725070-14765-2016', 'rb') as fin:
	with open('clean.txt', 'wb') as fout:
		for line in fin:
			# 16-23 date YYYYMMDD 20160101
			date = int(line[15:23])

			if date >= begin_date and date <= end_date:
				# 24-27 time HHMM, 00 < HH < 23 0000

				time = line[23:27]
				# 29-34 latitude +/-ddddd +41400 - +42000
				lat = line[28:34]

				# 35-41 longitude +/-ddddd -071320 - -071433
				lon = line[34:41]

				# 66-69 wind speed (meters/sec) scale x10
				# 71-75 height above ground of lowest cloud (meters)
				# 88-92 air temperature +/-dddd (C) scale x10

				# additional information (occurs after chars 'ADD')
				# r'AA\d' indicates precipitation
				## next 2 chars - num hours measured
				## next 4 chars - mm of rain x10
				# r'AW\d' reports present weather conditions
				precip = 0


				#probably only need AA1? 
				if re.search(r'AA\d', line) is not None:
					mm = re.search(r'AA\d\d\d\d\d\d\d', line).group()[5:]
					mm = int(mm) * 10
					if mm > 600:
						precip = 4
					elif mm > 200:
						precip = 3
					elif mm > 0:
						precip = 2
					else:
						precip = 1 

				if re.search(r'GA1\d', line) is None:
					print date, time, "errr no cloud"

				if precip > 0:
					precip = 1
				fout.write(str(date)+time+lat+lon+str(precip)+',')
