const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
    log: {
        type: String,
        required: true
    },
    hash: {
        required: true,
        type: String
    },
    timestamp: {
        required: true,
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', logSchema);