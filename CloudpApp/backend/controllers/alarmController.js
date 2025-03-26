require('dotenv').config(); // Load .env variables
const jwt = require("jsonwebtoken");
const Alarm = require("../models/alarms");
const speakeasy = require('speakeasy');
const logger = require("../logging/logger");

//@desc get all unread alarms
//@route POST /api/alarm
//@access private
const fetchAlarm = async (req, res) => {
  const alarms = await Alarm.find({ read: false }).sort({timestamp: -1});
  res.json(
    alarms.map((alarm) => ({
      _id: alarm._id,
      name: alarm.name,
      image: alarm.image.toString("base64"),
      timestamp: alarm.timestamp,
    }))
  );
}

// Mark an alarm as read
const updateAlarm = async (req, res) => {
    await Alarm.findByIdAndUpdate(req.params.id, { read: true });
    res.send("Alarm marked as read");
}

module.exports = {fetchAlarm, updateAlarm};