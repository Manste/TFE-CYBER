const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  timestamp: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  user: {
    type: String,
    required:true
  }
});

module.exports = mongoose.model("Challenge", challengeSchema);