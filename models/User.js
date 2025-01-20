const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'volunteer', 'admin'], default: 'user' },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'inactive',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  userDetails: {
    type: Schema.Types.ObjectId,
    ref: 'UserDetails',
  },

  
});

// Update the `updatedAt` field on each save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// // Hash password before saving
// userSchema.pre('save', async function (next) {
//   if (this.isModified('password')) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

module.exports = mongoose.model('User', userSchema);
