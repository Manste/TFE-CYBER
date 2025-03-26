const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Log = require("../models/logs");
require('dotenv').config();

mongoose.connect(process.env.DATABASE_URL, {});

async function readLog(outputFile="") {
    const logs = await Log.find();
    
    if(!logs.length) {
        console.log("No logs");
        return false;
    }

    const decLog = logs.map((encLog) => {
        const match = encLog.log.match(/(.*)\| HASH: ([a-f0-9]{64})$/);

        if(!match) {
            return false;
        }

        if(crypto.createHmac("sha256", process.env.ACCESS_TOKEN_SECRET).update(match[1].trim()).digest('hex') === match[2].trim()) {
            console.log("log integrity verified");
            return match[1].trim();
        } else {
            console.log("log integrity verification failed");
            return false; 
        }
    })

    const formatLogs = decLog.join("\n");

    if(outputFile) {
        fs.writeFileSync(path.resolve(__dirname, outputFile), formatLogs, "utf8");
        console.log("Logs saved in file");
    } else {
        console.log(formatLogs);
    }
}

async function resetDB() {
    await Log.deleteMany();

    console.log("done");
}

//resetDB();
readLog("log.log");