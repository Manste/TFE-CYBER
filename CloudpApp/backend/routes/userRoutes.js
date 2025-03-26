const logger = require("../logging/logger")
const router = require('express').Router()
const jwt = require('jsonwebtoken')
const {
    registerUser,
    currentUser,
    loginUser,
    generateChallenge
  } = require("../controllers/userController");
const User = require('../models/users')
const validateToken = require("../middleware/validateTokenHandler")
const rateLimit = require("express-rate-limit");

const challengeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 3, // Allow 3 challenges per user per windowMs
  message: "Too many challenge requests. Try again later.",
});

router.post('/register', registerUser)

router.post('/login', loginUser)

router.get('/current', validateToken, currentUser)

router.get('/challenge/:username', challengeLimiter, generateChallenge)

router.get('/logout', validateToken, (req, res) => {
    try {
        res.cookie('jwt', '', {maxAge:0})

        res.status(200).send({
            message: 'success'
        })
    } catch(error) {
        logger.info("500: Server Error")
        res.status(500).send({message: "Server error"})
    }
})

module.exports = router;