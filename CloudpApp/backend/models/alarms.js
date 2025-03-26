const mongoose = require("mongoose");

const alarmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: Buffer,
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
  },
  encrypted_symmetric_key: {
      type: String,
      //required: true
  },
  encrypted_hmac_key: {
      type: String,
      //required: true
  },
  user: {
    type: String,
    //required:true
  }
});

module.exports = mongoose.model("Alarm", alarmSchema);