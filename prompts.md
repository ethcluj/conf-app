# Features

## Schedule
### Session Cards
- [DONE] Bug: Descriptions with newlines are truncated.
- [DONE] Bug: Time displayed in UTC. Must display in EEST (no matter the timezone of the user).
### "Break" slots (e.g. Lunch, Coffee)
- [DONE] Add Break slots to the Schedule


### Time awareness
- [] Server/API Time  
- [DONE] Mark current slot (red dot next to stage name)
- [DONE] Auto scroll to current slot (upon reload only?)
- [] Update the current day marker. 
- [] Auto switch to current date upon reload.

## Session details
### Session difficulty
Make the following changes in the sessions API on the backend:
- [DONE] 1. Add a "type" field to the sessions API. Read it from the google sheet, "Type" column.
- [DONE] 2. The value of the "track" field should be read from the google sheet, "Track" column.



Now on the session details screen:
- [WONT] 1. rename the "Session Details" heading to "Details" 
- [WONT] 2. Intead of the difficutly card, Add a "Type" card displaying the type of session. The value can be found in the sessions API "type" field.
- [DONE] 3. Change the "Track" card to display the "track" field from the sessions API.


### Sessions with Multiple Speakers
- [] Schedule View: display multiple speakers photos (now white)
- [] Schedule View: if two speakers, write both names, otherwise write "multiple speakers"


## Q&A



## Unified Presenter View
- [] Session View: Switch Next / Previous
- [] Generate Video(s) 
- [] Session View: rearange screen (e.g. speakers below title, ethcluj logo bottom right, ETHCluj 2025 conference, stage name)



## Info Tab



## Disaster recovery
- [] Backend Logs



## No downtime deployments



## Optimizations
- [] Speaker images cache
- [] UX: improve navigation (memory). remember navigation for the back and home buttons



## Search feature



## PWA
- [] Add webpace ico and PWA icon
- [] Add PWA support
- [] Add instructions screen to install as PWA



## Notifications



## [DONE] Speakers
BACKEND Speakers Info: Now let's add a new feature on the backend - we need a new API (/speakers) that lists information related to speakers. The data is read from another tab ("Speakers") of the same google sheet that has the following format:

Name	Org	Social	Photo	Visible	Bio

Photo - is a link to an image (ex: https://formester.s3.ap-south-1.amazonaws.com/uploads/forms/93f1bef3-1433-4445-9b4b-f4b0599d2b45/submissions/afde729b-7b6b-49a7-928e-617ba69822c3/submission_attachments/2907ab03-e1d8-48fa-b6b0-60ca25cd3238/rainbow.jpg)

Visible - if false, the speaker is not displayed.

The name acts as an identifier. 

Edit all the necessary files to add the speakers API endpoint. Run it and test it. (fyi the docker backend container might need to be stoped if you need to run the backend locally on the same port)

### [DONE] Speaker image (both in schedule and session details page)
### Speaker info page


## Favorite Sessions
- [DONE] Local storage favourites
- [] Favourites view: add day separators
