
/**
 * @fileoverview Sync state management for preventing infinite loops in bidirectional sync.
 * Implements change tracking and loop detection mechanisms.
 */

/**
 * Manages sync state to prevent infinite loops
 */
class SyncStateManager {
    constructor() {
        this.syncOperations = new Map();
        this.changeOrigin = new Map();
        this.operationHistory = [];
        this.maxHistorySize = 1000;
        this.loopDetectionWindow = 300000; // 5 minutes in milliseconds
    }

    /**
     * Generates a unique operation ID for tracking
     */
    generateOperationId(calendarId, eventId, operation) {
        return `${calendarId}:${eventId}:${operation}:${Date.now()}`;
    }

    /**
     * Records a sync operation
     */
    recordOperation(sourceCalendarId, targetCalendarId, eventId, operation, metadata = {}) {
        const operationId = this.generateOperationId(targetCalendarId, eventId, operation);
        const timestamp = Date.now();

        const operationRecord = {
            id: operationId,
            sourceCalendarId,
            targetCalendarId,
            eventId,
            operation, // 'create', 'update', 'delete'
            timestamp,
            metadata
        };

        this.operationHistory.push(operationRecord);
        this.syncOperations.set(operationId, operationRecord);

        // Mark change origin
        const changeKey = `${targetCalendarId}:${eventId}`;
        this.changeOrigin.set(changeKey, {
            originCalendarId: sourceCalendarId,
            timestamp,
            operationId
        });

        // Cleanup old operations
        this.cleanupOldOperations();

        return operationId;
    }

    /**
     * Checks if an operation would create a loop
     */
    wouldCreateLoop(sourceCalendarId, targetCalendarId, eventId, operation) {
        const changeKey = `${sourceCalendarId}:${eventId}`;
        const recentChange = this.changeOrigin.get(changeKey);

        if (!recentChange) {
            return false;
        }

        const timeDiff = Date.now() - recentChange.timestamp;

        // If the change originated from the target calendar and we're about to sync back
        if (recentChange.originCalendarId === targetCalendarId &&
            timeDiff < this.loopDetectionWindow) {
            console.log(`Loop detected: ${sourceCalendarId} -> ${targetCalendarId} for event ${eventId}`);
            return true;
        }

        // Check for ping-pong patterns in recent history
        return this.detectPingPongPattern(sourceCalendarId, targetCalendarId, eventId);
    }

    /**
     * Detects ping-pong patterns in sync operations
     */
    detectPingPongPattern(sourceCalendarId, targetCalendarId, eventId) {
        const recentOperations = this.operationHistory
            .filter(op => {
                const timeDiff = Date.now() - op.timestamp;
                return timeDiff < this.loopDetectionWindow &&
                    op.eventId === eventId &&
                    (op.sourceCalendarId === sourceCalendarId || op.targetCalendarId === sourceCalendarId) &&
                    (op.sourceCalendarId === targetCalendarId || op.targetCalendarId === targetCalendarId);
            })
            .sort((a, b) => b.timestamp - a.timestamp);

        // Look for alternating pattern between calendars
        if (recentOperations.length >= 4) {
            const pattern = recentOperations.slice(0, 4);
            const isAlternating = pattern.every((op, index) => {
                if (index === 0) return true;
                const prevOp = pattern[index - 1];
                return (op.sourceCalendarId === prevOp.targetCalendarId &&
                    op.targetCalendarId === prevOp.sourceCalendarId);
            });

            if (isAlternating) {
                console.log(`Ping-pong pattern detected for event ${eventId} between ${sourceCalendarId} and ${targetCalendarId}`);
                return true;
            }
        }

        return false;
    }

    /**
     * Checks if an event should be skipped due to recent sync
     */
    shouldSkipSync(sourceCalendarId, targetCalendarId, eventId, sourceUpdated, targetUpdated) {
        const changeKey = `${targetCalendarId}:${eventId}`;
        const recentChange = this.changeOrigin.get(changeKey);

        if (!recentChange) {
            return false;
        }

        const timeDiff = Date.now() - recentChange.timestamp;

        // Skip if this change originated from the target calendar recently
        if (recentChange.originCalendarId === sourceCalendarId &&
            timeDiff < this.loopDetectionWindow) {

            // Additional check: if the timestamps are very close, it's likely a loop
            const timestampDiff = Math.abs(sourceUpdated.getTime() - targetUpdated.getTime());
            if (timestampDiff < 60000) { // 1 minute threshold
                console.log(`Skipping sync to prevent loop: ${sourceCalendarId} -> ${targetCalendarId} for event ${eventId}`);
                return true;
            }
        }

        return false;
    }

    /**
     * Cleans up old operation records
     */
    cleanupOldOperations() {
        const cutoffTime = Date.now() - this.loopDetectionWindow;

        // Clean operation history
        this.operationHistory = this.operationHistory.filter(op => op.timestamp > cutoffTime);

        // Clean sync operations map
        for (const [key, operation] of this.syncOperations.entries()) {
            if (operation.timestamp <= cutoffTime) {
                this.syncOperations.delete(key);
            }
        }

        // Clean change origin map
        for (const [key, change] of this.changeOrigin.entries()) {
            if (change.timestamp <= cutoffTime) {
                this.changeOrigin.delete(key);
            }
        }

        // Limit history size
        if (this.operationHistory.length > this.maxHistorySize) {
            this.operationHistory = this.operationHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Gets sync statistics for monitoring
     */
    getSyncStats() {
        const now = Date.now();
        const recentOperations = this.operationHistory.filter(op =>
            now - op.timestamp < this.loopDetectionWindow
        );

        const stats = {
            totalOperations: this.operationHistory.length,
            recentOperations: recentOperations.length,
            operationsByType: {},
            potentialLoops: 0
        };

        recentOperations.forEach(op => {
            stats.operationsByType[op.operation] = (stats.operationsByType[op.operation] || 0) + 1;
        });

        // Count potential loops (operations with similar patterns)
        const eventGroups = new Map();
        recentOperations.forEach(op => {
            const key = `${op.sourceCalendarId}:${op.targetCalendarId}:${op.eventId}`;
            if (!eventGroups.has(key)) {
                eventGroups.set(key, []);
            }
            eventGroups.get(key).push(op);
        });

        eventGroups.forEach(operations => {
            if (operations.length > 2) {
                stats.potentialLoops++;
            }
        });

        return stats;
    }
}

// Global instance
let syncStateManager;

/**
 * Gets or creates the global sync state manager
 */
function getSyncStateManager() {
    if (!syncStateManager) {
        syncStateManager = new SyncStateManager();
    }
    return syncStateManager;
}

/**
 * Resets the sync state manager (useful for testing)
 */
function resetSyncStateManager() {
    syncStateManager = new SyncStateManager();
}

// For Node.js testing environment
if (typeof module !== 'undefined') {
    module.exports = {
        SyncStateManager,
        getSyncStateManager,
        resetSyncStateManager
    };
}