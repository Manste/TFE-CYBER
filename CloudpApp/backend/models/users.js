const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    hmac_username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    hmac_email: {
        type: String,
        required: true
    },
    encrypted_symmetric_key: {
        type: String,
        required: true
    },
    signature_symmetric_key: {
        type: String,
        required: true
    },
    encrypted_hmac_key: {
        type: String,
        required: true
    },
    signature_hmac_key: {
        type: String,
        required: true
    },
    public_key: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("User", userSchema)