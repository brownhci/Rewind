I'm leaving this file so that whoever picks up working on rewind.js knows what's currently happening, as I'm leaving for the semester.

The route selection algorithm currently functions with the data as follows. (See Route Selection Info.txt for info on how the algorithm itself works)
The data is split into days on upload, then is processed via the processPeriod function.
In the past, we experimented with having periods that were a week or a month long; this is why getNextPeriodDate and getPrevPeriodDate are more robust
    than the current functionality is. At the top of each of these functions, p_choice = "day" means that we automatically assume the periods are 1 day long.
If no routes are found for the current day of data, the algorithm automatically moves to the next (or previous) day. 

There were some functionality blips that I never got around to correcting:
Sometimes, we show a route that Google doesn't have Street View images for, so the route that comes up is just a grey screen that says "Sorry, we have no imagery here."
    This should probably be corrected somehow, with routes without imagery being eliminated from consideration in pullRoutesfromLocs.
When playing a Rewind, if a user spends some time in one place (e.g. at a stoplight while driving), the Rewind will pull multiple of the same image to show to the user.
    This isn't really ideal all the time because it disrupts the smoothness of the image sequence, so it might be nice to eliminate those duplicate images.

Please email me (philip_hinch@brown.edu) if you have any questions! I tried to add comments to my things, but it is a pretty confusing js file, so I'm happy to help in any way I can.
