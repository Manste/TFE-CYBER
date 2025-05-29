const router = require('express').Router()
const jwt = require('jsonwebtoken')
const {
    fetchAlarm,
    updateAlarm,
  } = require("../controllers/alarmController");
const Alarm = require('../models/alarms')
router.get('', fetchAlarm)

router.put('/:id', updateAlarm)

module.exports = router;