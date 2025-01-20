// models/UserDetails.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const userDetailsSchema = new Schema({
    name: { type: String, required: true },
    dateOfBirth: { type: Date},
    gender: { type: String, enum: ["Male", "Female"]},
    contact: {
        mobile: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        address: { type: String}
    },
    emergencyContact: {
        name: { type: String},
        relationship: { type: String},
        phone: { type: String }
    },
    createdAt: {type: Date, default: Date.now,},
    updatedAt: {type: Date, default: Date.now,}
});

userDetailsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = model('UserDetails', userDetailsSchema);
