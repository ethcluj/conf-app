# ETHCluj Conference Q&A System Requirements

## Overview

The ETHCluj Conference Q&A System allows attendees to submit and upvote questions during conference sessions. Questions are displayed in descending order by votes, with the most popular questions at the top. The system updates in real-time and minimizes authentication requirements while preventing abuse.

## User Access Points

Attendees can access the Q&A system through multiple entry points:

1. **Session-specific QR Code**: Located at each stage, directs users to the Q&A for that specific stage and automatically selects the current/upcoming session based on time.

2. **Generic QR Code**: Available on attendee badges, requires manual stage selection but automatically selects the appropriate session based on time.

3. **In-App Access**: Users can navigate to a session in the conference app and tap the Q&A button at the bottom of the session details screen.

## Core Functionality

### For Attendees
1. View questions anonymously without authentication
2. Ask questions (requires minimal authentication)
3. Upvote questions (requires minimal authentication)
4. Withdraw votes from previously upvoted questions
5. Vote for multiple questions within the same session
6. Navigate between session Q&As
7. See real-time updates of questions and votes
8. Participate in the leaderboard for best questions

### For Presenters/MCs
1. Special landscape view showing top questions and vote counts
2. QR code display for attendees to easily join the session Q&A
3. No special authentication or moderation functionality required

## User Identity & Authentication

1. **Initial Access**: No authentication required to view questions
2. **Participation**: Minimal authentication required when asking or upvoting
3. **User Identity**:
   - Users are assigned random funny Ethereum-themed names (like Docker containers)
   - Users can customize their display name
   - Names persist across sessions
4. **Anti-Sybil Protection**: Simple measures using browser fingerprinting or device identification. Note that IP-based identification won't be effective as most attendees will likely connect through the same venue WiFi network.

## UI/UX Requirements

### Mobile View (Attendee)
1. **Header Section**:
   - Current session information (title, speaker, time)
   - Stage indicator
   - Session navigation controls (previous/next)

2. **Question List**:
   - Sorted by vote count (descending)
   - Each question shows: vote count, question text, submitter name, timestamp
   - Visual indicator for questions the user has voted on
   - Real-time updates via WebSockets

3. **Question Input**:
   - Fixed at bottom of screen
   - Character limit indicator
   - Submit button (triggers authentication if needed)

4. **Authentication**:
   - Minimal and non-intrusive
   - Only triggered when necessary (asking/upvoting)
   - Email-based verification
   - Session persistence to prevent repeated authentication

5. **Leaderboard**:
   - Shows users with the best/most upvoted questions
   - Incentivizes quality participation with prizes

### Projector View (Presenter)
1. **Landscape orientation** optimized for large displays
2. **Prominently displayed questions** sorted by votes
3. **Vote counts** clearly visible
4. **QR code** for audience to join the session Q&A
5. **Session information** clearly displayed

## Design Considerations

1. **Minimizing Authentication Friction**:
   - Store authentication state locally
   - Use browser fingerprinting as preliminary Sybil protection
   - Only trigger email verification when necessary

2. **Handling Time Context**:
   - Show historical questions for past sessions with clear indication
   - Provide option to navigate to current active session

3. **Mobile Optimization**:
   - Compact design with focus on most voted questions
   - Efficient use of limited screen space

4. **Cross-Device Experience**:
   - Email verification as identity anchor across devices

## Technical Requirements

1. **Real-time Updates**: WebSocket implementation for immediate question and vote synchronization
2. **Data Persistence**: Questions and votes should be stored permanently
3. **Analytics**: Simple dashboard with basic statistics (questions per session, engagement metrics)

## Non-Requirements

1. Question moderation functionality
2. Question categorization/tagging
3. Speaker authentication or specialized speaker interfaces
4. Question status tracking (answered/unanswered)
5. "Save for later" functionality
6. Technical implementation of answers (answers are given verbally in-session)
7. Quadratic voting as an instrument to enhance sybil resistance

---

This document serves as a comprehensive guide for implementing the ETHCluj Conference Q&A System, covering user experience, functionality, and technical considerations.
