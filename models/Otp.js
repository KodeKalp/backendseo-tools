// models/Otp.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const otpSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // OTP will expire after 5 minutes (300 seconds)
  },
});

module.exports = model('Otp', otpSchema);
