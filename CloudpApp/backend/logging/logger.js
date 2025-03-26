const winston = require("winston");
const crypto = require("crypto");
const logSchema = require("../models/logs");
const helper = require("./logger-helper");
const { combine, timestamp, printf } = winston.format;

function sanitize(input) { // sanitization message
    if(typeof input !== 'string') return "";
    const maxLength = 500; 

    const message = input
        .replace(/[\r\n]+/g, " ") // remove newlines (prevent log injection)
        .replace(/\t/g, " ") // replace tabs
        .replace(/%/g, "%25") // escape '%' (prevent formatting issues)
        .replace(/\|/g, "\\|") // escape '|' (prevent delimiter misuse)
        .replace(/[<>]/g, ""); // remove HTML/JS tags

    const cleanMessage = message.replace(
        /(password|token|secret|key|credential)(\s*[:=]\s*)([^\s]+)/gi, // hide sensitive content
        (_, key, sep) => `${key}${sep}******`
    );

    if(cleanMessage.length > maxLength) { // avoid too long message
        return cleanMessage.substring(0, maxLength) + "... [TRUNCATED]";
    }

    return cleanMessage;
}

function getHash(log) {
    return crypto.createHmac('sha256', process.env.ACCESS_TOKEN_SECRET).update(log).digest('hex');
}

// custom Winston transport for MongoDB
class MongoDBTransport extends winston.Transport {
    log(info, callback) {
        const { timestamp, level, message, ...meta } = info;
        let logData = meta[Symbol.for("message")];
        
        const logEntry = new logSchema({
            log: logData,
            hash: getHash(logData)
        });

        helper.checkLogEntry(info);

        logEntry.save()
            .then(() => callback(null, true))
            .catch((err) => callback(err, false));
    }
}

// Configure the logger
const logger = winston.createLogger({
    level: "info",
    format: combine(
        timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
        printf(({ timestamp, level, message, stack, ...meta }) => {
            let safeMessage = sanitize(message);
            let log = `[${timestamp}] ${level.toUpperCase()}: ${safeMessage}`;
            if(Object.keys(meta).length) log += ` ${JSON.stringify(meta)}`; // show JSON format 
            if(stack) log += `\n${stack}`; // show error/exceptions 
            return log;
        })
    ),
    transports: [
        new MongoDBTransport(),
        new winston.transports.Console(), // log to "regular" console
    ],
});

module.exports = logger;
