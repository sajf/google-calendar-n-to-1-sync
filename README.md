# Google Calendar N-to-1 Sync (Aggregation Script)

This Google Apps Script project provides a robust solution for bidirectional synchronization between multiple source calendars and one central target calendar.

  <!-- I recommend creating a simple diagram -->

## Key Features

- **Aggregation (N → 1):** Automatically copies events (including creation, updates, and deletions) from multiple source calendars into one main calendar.
- **Reverse synchronization of changes (1 → N):** If you edit or delete an event in the main calendar, the change is automatically propagated back to its original source.
- **Resilience:** The script is designed to prevent infinite update cycles ("ping-pong" effect).
- **Flexibility:** Easy configuration for any number of source calendars.
- **Security:** Uses `LockService` to prevent concurrent execution and `extendedProperties.private` to hide synchronization metadata.

**Important:** New events created directly in the target calendar are intentionally not synchronized anywhere.

## Installation

1.  **Create project:**
    - Go to [script.google.com](https://script.google.com/) and create a new project.
    - (Recommended) Use [Google Apps Script CLI (`clasp`)](https://github.com/google/clasp) to clone this repository and upload files to the project.
      ```bash
      npm install -g @google/clasp
      clasp login
      clasp clone <scriptId>
      # Copy files from this repository and upload them
      clasp push
      ```

2.  **Enable API:**
    - In the script editor, go to **Services (+)**.
    - Find **Google Calendar API** and add it.

3.  **Configuration:**
    - Open the `src/config.js` file.
    - Insert your calendar IDs into the `SOURCE_CALENDAR_IDS` array and the `TARGET_CALENDAR_ID` constant.

    ```javascript
    // src/config.js
    const SOURCE_CALENDAR_IDS = ['source-a@group.calendar.google.com', 'source-b@group.calendar.google.com'];
    const TARGET_CALENDAR_ID = 'target-calendar@group.calendar.google.com';
    ```

4.  **Set up trigger:**
    - In the script editor, select and run the `setupAutomaticSync()` function.
    - This will create a time trigger that will run the `runNto1Sync()` function every 15 minutes.

## Testing

The project includes a suite of unit tests to verify logic and a concept for E2E tests.

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run tests:**
    ```bash
    npm test
    ```

## Workflow and Limitations

- **Edits:** For best results, we recommend making event edits primarily in the **target (aggregated) calendar**.
- **Recurring events:** Changes to entire series of recurring events should be made exclusively in the source calendars. The script fully supports only changes to individual occurrences.
- **Privacy:** Make sure the sharing settings of the target calendar are as restrictive as the most sensitive of the source calendars to prevent unwanted information disclosure.

## Contributing

Pull requests are welcome! For major changes, please first open an issue for discussion.

## License

[MIT](LICENSE)
