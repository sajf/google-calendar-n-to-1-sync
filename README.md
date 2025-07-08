# Google Calendar N-to-1 Sync

This Google Apps Script project provides a robust solution for bidirectional synchronization between multiple source calendars and one central target calendar.

## Key Features

- **Aggregation (N → 1):** Automatically copies events (including creation, updates, and deletions) from multiple source calendars into one main calendar.
- **Reverse synchronization (1 → N):** If you edit or delete an event in the main calendar, the change is automatically propagated back to its original source.
- **Loop detection:** The script is designed to prevent infinite update cycles ("ping-pong" effect).
- **Detailed progress reporting:** Monitor synchronization progress with a web-based UI that shows real-time status, logs, and sync history.
- **Web-based configuration:** Easy setup through a user-friendly interface with calendar selection and advanced settings.
- **Error recovery:** Robust error handling with automatic retries, exponential backoff, and quota management.
- **Security:** Uses `LockService` to prevent concurrent execution and `extendedProperties.private` to hide synchronization metadata.
- **Sync state management:** Tracks synchronization operations to prevent loops and optimize performance.

**Important:** New events created directly in the target calendar are intentionally not synchronized anywhere.

## Setup Instructions

### Deployment

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install clasp globally (if not already installed):
   ```bash
   npm install -g @google/clasp
   ```
4. Login to Google:
   ```bash
   clasp login
   ```
5. Create a new Google Apps Script project or use an existing one:
   ```bash
   clasp create --title "Calendar N-to-1 Sync" --rootDir ./src
   ```
   or update `.clasp.json` with your existing script ID.
6. Push the code to Google Apps Script:
   ```bash
   clasp push
   ```
7. Open the script in the browser:
   ```bash
   clasp open
   ```
8. Enable the Calendar API:
   - In the script editor, go to **Services (+)**.
   - Find **Google Calendar API** and add it.
9. Deploy as a web app (optional, for web UI access):
   - In the script editor, go to **Deploy > New deployment**.
   - Select **Web app** as the deployment type.
   - Set "Who has access" to appropriate level (typically "Only myself" or "Anyone within [your organization]").
   - Click **Deploy** and copy the web app URL for future access.

### Configuration

There are two ways to configure the application:

#### Method 1: Web-based Configuration UI (Recommended)

1. In the Google Apps Script editor, run the `onOpen` function to create the menu
2. From the Google Sheets, Docs, or Forms menu, select "Calendar Sync" > "Configuration"
3. In the configuration UI:
   - Add source calendars (the calendars you want to sync from)
   - Select a target calendar (where all events will be aggregated)
   - Configure sync settings (days back, days forward)
   - Set advanced options (loop detection window, max sync attempts, etc.)
   - Save the configuration

You can also access the configuration UI directly through the web app URL if you've deployed it as a web app.

#### Method 2: Direct Code Editing

1. Open the `src/config.js` file.
2. Insert your calendar IDs into the `SOURCE_CALENDAR_IDS` array and the `TARGET_CALENDAR_ID` constant.

   ```javascript
   // src/config.js
   const SOURCE_CALENDAR_IDS = ['source-a@group.calendar.google.com', 'source-b@group.calendar.google.com'];
   const TARGET_CALENDAR_ID = 'target-calendar@group.calendar.google.com';
   ```
3. Optionally configure additional sync settings in the `SYNC_CONFIG` object:

   ```javascript
   const SYNC_CONFIG = {
     DAYS_BACK: 14,
     DAYS_FORWARD: 90,
     LOOP_DETECTION_WINDOW: 300000,
     MAX_SYNC_ATTEMPTS: 3,
     MIN_UPDATE_INTERVAL: 60000
   };
   ```

### Running the Sync

You can run the synchronization in several ways:

1. **Manual UI:** From the Google Sheets, Docs, or Forms menu, select "Calendar Sync" > "Run Sync Now"
2. **Progress UI:** Click the "Run Sync Now" button in the Progress Monitor UI
3. **Manual Code:** In the script editor, run the `runNto1Sync()` function directly
4. **Automatic:** Set up a time-based trigger for the `runNto1Sync()` function:
   - In the script editor, select and run the `setupAutomaticSync()` function.
   - This will create a time trigger that will run the sync every 15 minutes.

## Monitoring Progress

1. From the Google Sheets, Docs, or Forms menu, select "Calendar Sync" > "Progress Monitor"
2. Alternatively, access the Progress Monitor directly through the web app URL if deployed as a web app
3. The progress UI shows:
   - Current synchronization progress with a visual progress bar
   - Real-time status updates and detailed logs
   - Summary of completed synchronizations (duration, success/failure, errors)
   - History of past synchronization operations
   - Auto-refresh functionality to keep the UI updated

The Progress Monitor provides comprehensive insights into the synchronization process, helping you identify and troubleshoot any issues that may arise.

## Workflow and Limitations

- **Edits:** For best results, we recommend making event edits primarily in the **target (aggregated) calendar**.
- **Recurring events:** Changes to entire series of recurring events should be made exclusively in the source calendars. The script fully supports only changes to individual occurrences.
- **Privacy:** Make sure the sharing settings of the target calendar are as restrictive as the most sensitive of the source calendars to prevent unwanted information disclosure.
- **API Quotas:** The application includes quota management to prevent exceeding Google Calendar API limits, but very large calendars or frequent updates may still encounter quota issues.
- **Error Recovery:** The application includes automatic retry mechanisms with exponential backoff for recoverable errors, but some errors may still require manual intervention.

## Development

### Project Structure

- `src/main.js`: Core synchronization logic and error handling
- `src/config.js`: Default configuration settings
- `src/utils.js`: Utility functions for API calls and data manipulation
- `src/syncState.js`: Synchronization state management for loop detection
- `src/ui/`: Web-based UI files
  - `configUi.html`: Configuration UI with calendar selection and advanced settings
  - `progressUi.html`: Progress monitoring UI with real-time updates and history
  - `uiService.js`: Server-side functions for the UI components
- `appsscript.json`: Project configuration for Google Apps Script

### Error Handling

The application implements a comprehensive error handling strategy:

- **Error Classification:** Errors are classified into specific types (CalendarAccessError, QuotaExceededError, EventSyncError, LoopDetectionError)
- **Recovery Strategies:** Different recovery strategies are applied based on error type
- **Retry Mechanism:** Automatic retries with exponential backoff for transient errors
- **Quota Management:** Monitoring and management of API quota usage
- **Detailed Logging:** Comprehensive logging for troubleshooting

### Testing

The project includes a suite of unit tests to verify logic and a concept for E2E tests.

Run tests with:
```bash
npm test
```

## Contributing

Pull requests are welcome! For major changes, please first open an issue for discussion.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
