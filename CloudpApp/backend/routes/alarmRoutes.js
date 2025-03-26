const logger = require("../logging/logger")
const router = require('express').Router()
const jwt = require('jsonwebtoken')
const {
    fetchAlarm,
    updateAlarm,
  } = require("../controllers/alarmController");
const Alarm = require('../models/alarms')
const validateToken = require("../middleware/validateTokenHandler")

router.get('', fetchAlarm)

router.put('/:id', updateAlarm)

module.exports = router;