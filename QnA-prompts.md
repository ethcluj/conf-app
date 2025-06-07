
I want to implement a QnA system where, for a particulat session, conference attendees can ask questions and upvote questions asked by others. The top questions will be displayed at the top (descending order by number of votes) of the same screen where users ask questions. 

Real life Scenarios:

5 minutes before A session starts (and throughout the session) users can scan a QnA QR code that will lead them to the QnA section for a particular stage. Based on the current time, the app knows what session follows and also directs the user to that sessions QnA. Manually, the user can adjust and jump to the next or previous session in the schedule.

Alternatively, the users can scan a generic QnA qr code (e.g. from its badge) that has no stage specified and then the user needs to select the stage manually, but the sessions is selected automatically just as in the previous use case.

And another option to open the QnA section for a session: the users can also open app.ethcluj.org and select the session manually. They have a QnA button there at the bottom of the session details screen.

USers can ask questions or upvote another question from the session.

At the end, the MC or the speaker can read the most voted questions. (unless you have a great idea, not necessary to implement anything for these personas)

The list of questions and votes are updated in real time (websockets).

There is a protection to voting Sybil attacks (simple local IP or browser ID)

In order to ask or upvote a question, a user must authenticate via email (with verification code or link from email). Don't be intrusive here. We want to only make the user authenticate if strictly necessary. Otherwise, ideally, the user must be able to use the app anonymously.

Who asks the best questions, gets to win something, so there is also a leaderboard.






