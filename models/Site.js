// models/Site.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const siteSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  status: {
    type: Boolean,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model('Site', siteSchema);
