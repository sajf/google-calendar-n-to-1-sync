/**
 * @file UI service functions for the configuration interface.
 * Contains server-side functions called from the web UI.
 */

/**
 * Shows the configuration UI.
 * This function creates a web app that allows users to configure the calendar sync.
 * @returns {HtmlOutput} The HTML UI for configuration
 */
function showConfigurationUI() {
  const html = HtmlService.createHtmlOutputFromFile('ui/configUi')
    .setTitle('Calendar N-to-1 Sync Configuration')
    .setWidth(800)
    .setHeight(600);

  return html;
}

/**
 * Gets the user's calendars for selection in the UI.
 * @returns {Array} Array of calendar objects with id and name
 */
function getUserCalendars() {
  try {
    const calendars = Calendar.CalendarList.list().items;
    return calendars.map(calendar => ({
      id: calendar.id,
      name: calendar.summary || calendar.id
    }));
  } catch (error) {
    console.error('Error getting user calendars:', error);
    throw new Error('Failed to load calendars: ' + error.message);
  }
}

/**
 * Gets the current configuration for display in the UI.
 * @returns {object} The current configuration
 */
function getConfiguration() {
  try {
    // Get configuration from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const configJson = scriptProperties.getProperty('SYNC_CONFIGURATION');

    if (configJson) {
      return JSON.parse(configJson);
    }

    // If no saved configuration exists, return the default configuration from config.js
    return {
      sourceCalendarIds: SOURCE_CALENDAR_IDS || [],
      targetCalendarId: TARGET_CALENDAR_ID || '',
      syncConfig: SYNC_CONFIG || {
        DAYS_BACK: 14,
        DAYS_FORWARD: 90,
        LOOP_DETECTION_WINDOW: 300000,
        MAX_SYNC_ATTEMPTS: 3,
        MIN_UPDATE_INTERVAL: 60000
      }
    };
  } catch (error) {
    console.error('Error getting configuration:', error);
    throw new Error('Failed to load configuration: ' + error.message);
  }
}

/**
 * Saves the configuration from the UI.
 * @param {object} config - The configuration object from the UI
 * @returns {object} Result object with success status and error message if applicable
 */
function saveConfiguration(config) {
  try {
    // Validate configuration
    if (!config.targetCalendarId) {
      return { success: false, error: 'Target calendar ID is required' };
    }

    if (!config.sourceCalendarIds || config.sourceCalendarIds.length === 0) {
      return { success: false, error: 'At least one source calendar ID is required' };
    }

    // Format the configuration to match the expected structure
    const formattedConfig = {
      sourceCalendarIds: config.sourceCalendarIds,
      targetCalendarId: config.targetCalendarId,
      syncConfig: {
        DAYS_BACK: config.syncConfig.daysBack || 14,
        DAYS_FORWARD: config.syncConfig.daysForward || 90,
        LOOP_DETECTION_WINDOW: config.syncConfig.loopDetectionWindow || 300000,
        MAX_SYNC_ATTEMPTS: config.syncConfig.maxSyncAttempts || 3,
        MIN_UPDATE_INTERVAL: config.syncConfig.minUpdateInterval || 60000
      }
    };

    // Save configuration to script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('SYNC_CONFIGURATION', JSON.stringify(formattedConfig));

    // Test access to calendars
    try {
      // Test access to target calendar
      Calendar.Calendars.get(config.targetCalendarId);

      // Test access to source calendars
      for (const sourceId of config.sourceCalendarIds) {
        Calendar.Calendars.get(sourceId);
      }
    } catch (accessError) {
      return {
        success: false,
        error: 'Configuration saved, but calendar access test failed: ' + accessError.message
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving configuration:', error);
    return { success: false, error: 'Failed to save configuration: ' + error.message };
  }
}

/**
 * Creates menu items to open the configuration and progress UIs.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi() || DocumentApp.getUi() || FormApp.getUi() || SlidesApp.getUi();

  if (ui) {
    ui.createMenu('Calendar Sync')
      .addItem('Configuration', 'showConfigurationUI')
      .addItem('Progress Monitor', 'showProgressUI')
      .addSeparator()
      .addItem('Run Sync Now', 'runNto1Sync')
      .addToUi();
  }
}

/**
 * Shows the progress UI.
 * This function creates a web app that allows users to monitor the synchronization progress.
 * @returns {HtmlOutput} The HTML UI for progress monitoring
 */
function showProgressUI() {
  const html = HtmlService.createHtmlOutputFromFile('ui/progressUi')
    .setTitle('Calendar N-to-1 Sync Progress')
    .setWidth(800)
    .setHeight(700);

  return html;
}

/**
 * Gets the current synchronization progress.
 * @returns {object} The current progress data
 */
function getSyncProgress() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const progressJson = scriptProperties.getProperty('SYNC_PROGRESS');

    if (progressJson) {
      return JSON.parse(progressJson);
    }

    return null;
  } catch (error) {
    console.error('Error getting sync progress:', error);
    throw new Error('Failed to load sync progress: ' + error.message);
  }
}

/**
 * Gets the synchronization history.
 * @returns {Array} Array of past synchronization operations
 */
function getSyncHistory() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const historyJson = scriptProperties.getProperty('SYNC_HISTORY');

    if (historyJson) {
      return JSON.parse(historyJson);
    }

    return [];
  } catch (error) {
    console.error('Error getting sync history:', error);
    throw new Error('Failed to load sync history: ' + error.message);
  }
}

/**
 * Runs when the web app is deployed as a web app.
 * @param e
 * @returns {HtmlOutput} The HTML UI for progress monitoring (default) or configuration
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.page === 'config') {
    return showConfigurationUI();
  }

  return showProgressUI();
}
