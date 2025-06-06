# Features

## [DONE] Schedule
### [DONE] Session Cards
- Bug: Descriptions with newlines are truncated.
- Bug: Time displayed in UTC. Must display in EEST (no matter the timezone of the user).
### "Break" slots (e.g. Lunch, Coffee)


### Time awareness
Mark current slot (red dot next to stage name)
Auto scroll to current slot (upon reload only?)
Update the current day marker. 
Auto switch to current date upon reload.

## Session details
### Session difficulty
Make the following changes in the sessions API on the backend:
1. Add a "type" field to the sessions API. Read it from the google sheet, "Type" column.
2. The value of the "track" field should be read from the google sheet, "Track" column.



Now on the session details screen:
1. rename the "Session Details" heading to "Details" 
2. Intead of the difficutly card, Add a "Type" card displaying the type of session. The value can be found in the sessions API "type" field.
3. Change the "Track" card to display the "track" field from the sessions API.


### Sessions with Multiple Speakers

## Q&A

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

## Optimizations
### Speaker images cache