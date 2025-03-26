require('dotenv').config(); // Load .env variables
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const Challenge = require("../models/challenges");
const logger = require("../logging/logger");
const crypto = require('crypto')

//@desc Register a user
//@route POST /api/user/register
//@access public
const registerUser = async (req, res) => {
    const userAvailable = await User.findOne({ username: req.body.username})
    if (userAvailable) {
        logger.info("400: User already registered")
        return res.status(400).send({message: "User already registered!"})
    }
    let user;
    user = new User({
        username: req.body.username,
        hmac_username: req.body.hmac_username,
        email: req.body.email,
        hmac_email: req.body.hmac_email,
        encrypted_symmetric_key: req.body.encrypted_symmetric_key,
        signature_symmetric_key: req.body.signature_symmetric_key,
        encrypted_symmetric_key_videos: req.body.encrypted_symmetric_key_videos,
        signature_symmetric_key_videos: req.body.signature_symmetric_key_videos,
        encrypted_hmac_key: req.body.encrypted_hmac_key,
        signature_hmac_key: req.body.signature_hmac_key,
        encrypted_hmac_key_videos: req.body.encrypted_hmac_key_videos,
        signature_hmac_key_videos: req.body.signature_hmac_key_videos,
        public_key: req.body.public_key
    })
    const result = await user.save();

    const {username, email, hmac_email, ...data} = await result.toJSON()
    return res.status(200).send({username, email, hmac_email, success: true})
}

//@desc Login user
//@route POST /api/user/login
//@access public
const loginUser = async(req, res) => {
    const { username, signature } = req.body;
    let user = await User.findOne({username: username})
    const challenge = await Challenge.findOne({user: username});
    if (!user) {
        logger.info("401: Username is not valid");
        return res.status(401).send({messsage: "username is not valid"});
    }

    if (!challenge) { 
        logger.info("400: Invalid or expired challenge");
        await challenge.deleteOne();
        return res.status(400).json({ success: false, message: 'Invalid or expired challenge' });
    }
    const publicKey = current_user.public_key // Saved during registration
    const isVerified = await verifySignature(
        base64ToArrayBuffer(challenge.content),
        base64ToArrayBuffer(signature),
        importPublicKey(publicKey)
    );
    await Challenge.deleteOne({ _id: challengeDoc._id });

    if (!isVerified) {
        logger.info("400: Invalid signature")
        return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const accessToken = jwt.sign(
        {
          user: {
            public_key: user.public_key,
            username: user.username,
            id: user._id
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "30m" }
    );
    const {public_key, private_key, ...data} = user
    return res.status(200).send({ accessToken , public_key})
}

//@desc Current user info
//@route GET /api/user/current
//@access private
const currentUser = async (req, res) => {
    try {
        let user = await User.findOne({username: req.user.username})
        const {public_key, ...data} = await user.toJSON()
        res.status(200).send({data})
    } catch (e) {
        logger.info("400: Unauthorized")
        res.status(400).send({message: "Unauthorized"})
    }
}

const arrayBufferToBase64 = (buffer) => {
    return Buffer.from(buffer).toString('base64');
};

const base64ToArrayBuffer = (base64) => {
    return Uint8Array.from(Buffer.from(base64, 'base64')).buffer;
};

const generateChallenge = async (req, res) => {
    try {
         const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const challenge = crypto.randomBytes(32).toString("base64"); 
        Challenge.create({
            user: req.params.username,
            content: challenge
        });
        res.status(200).json({ challenge });
    } catch(e) {
        res.status(500).send({message: "Server error"});
    }
}

// Helper: Verify signature using user's public key
const verifySignature = async (challenge, signature, publicKey) => {
    return await crypto.subtle.verify(
        { name: "RSA-PSS", saltLength: 32 },
        publicKey,
        signature,
        challenge
    );
};

const importPublicKey = async (base64Key) => {
    const keyBuffer = base64ToArrayBuffer(base64Key);
    let keyUsages = ['verify'];
    let algorithmName = 'RSASSA-PKCS1-v1_5';  
    return await crypto.subtle.importKey(
        "spki",
        keyBuffer,
        {
            name: algorithmName,
            hash: { name: "SHA-256" }
        },
        true,
        keyUsages
    );
};

module.exports = { registerUser, loginUser, currentUser, generateChallenge };