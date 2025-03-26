const ATTEMPT_WINDOW = 60000; // attemps for brute force
const INACTIVITY_ALERT = 1000; // attemps for inactivity
const MAX_ACTIVITY_COUNT = 50 // max attemps for too much activity
const MAX_ENDPOINT_ISSUES = 100; // too much 400 errors
const MAX_CHUNK_DELAY_AMOUNT = 100;

class ExpiringMap {
    constructor(expTime) {
        this.expTime = expTime;
        this.map = new Map();
    }

    set(key, value) {
        const now = Date.now();
        this.map.set(key, { value, timestamp: now });
        setTimeout(() => this.map.delete(key), this.expTime);
    }

    get(key) {
        const entry = this.map.get(key);
        if(entry && Date.now() - entry.timestamp < this.expTime) {
            return entry.value;
        } else {
            this.map.delete(key); // clean up expired entry
            return undefined;
        }
    }

    has(key) {
        const entry = this.map.get(key);
        if(entry && Date.now() - entry.timestamp < this.expTime) {
            return true;
        } else {
            this.map.delete(key);
            return false;
        }
    }
}

function sendAlert(message) {
    console.warn(message);
}

const dectectionMemory = {
    chunkDelays: new ExpiringMap(ATTEMPT_WINDOW), // Track chunk delays
    endpointErrors: new ExpiringMap(ATTEMPT_WINDOW), // Track endpoints errors
    inactivityCounts: new ExpiringMap(ATTEMPT_WINDOW),
    userActivity: new ExpiringMap(ATTEMPT_WINDOW),
};

function checkLogEntry(log) {
    const level = log.level;
    const message = log.message;
    const timestamp = log.timestamp;
    const userID = log.userID || "";
    const chunk = log.chunk || "";

    const now = Date.now();
    
    // detect chunk issues
    if(level === "warn" && meta && meta.chunk && meta.delay) {
        const count = (dectectionMemory.chunkDelays.get(1) || 0) + 1;
        dectectionMemory.chunkDelays.set(1, count);

        if(count > MAX_CHUNK_DELAY_AMOUNT) {
            sendAlert(`Too much chunk delayed: ${count}`);
        }
    }

    // detect endpoint issues
    if(level === "info" && message.includes("404")) {
        const count = (dectectionMemory.endpointErrors.get(1) || 0) + 1;
        dectectionMemory.endpointErrors.set(1, count);

        if(count > MAX_ENDPOINT_ISSUES) {
            sendAlert(`Endpoint issue detected`);
        }
    }

    // detect too much inactivity
    if(level === "error" && message.includes("inactivity")) {
        const count = (dectectionMemory.inactivityCounts.get(1) || 0) + 1;
        dectectionMemory.inactivityCounts.set(1, count);

        if(count > INACTIVITY_ALERT) {
            sendAlert(`Too much inactivity detected`);
        }
    }

    if(userID) {
        const userCount = dectectionMemory.userActivity.get(userID) || { count: 0};
        userCount.count += 1;

        dectectionMemory.userActivity.set(userID, userCount);
    }

    // detect weird activity
    dectectionMemory.userActivity.map.forEach((activity, userID) => {
        if(activity.value.count > MAX_ACTIVITY_COUNT) {
            sendAlert(`Anormal activity detected for user ID: ${userID} with ${activity.value.count} actions.`);
            return false;
        }
    });
}

module.exports = { checkLogEntry }