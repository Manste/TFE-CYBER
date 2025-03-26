const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  frame: {
    type: Array,
    required: true
  },
  timestamp: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  read: {
    type: Boolean, 
    required: true,
    default: false
  }
});

module.exports = mongoose.model("Alarm", videoSchema);