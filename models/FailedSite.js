// models/FailedSite.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const failedSiteSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model('FailedSite', failedSiteSchema);
