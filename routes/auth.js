const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const UserDetails = require('../models/UserDetails');
const Otp = require('../models/Otp');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "defaultSecret";

// Setup nodemailer transporter with SMTP configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',       // e.g., 'smtp.example.com'
  port: 587, // Convert to number
  secure: process.env.SMTP_SECURE === 'true', // Convert to boolean
  auth: {
    user: 'test.kkgt@gmail.com',     // SMTP user email
    pass: 'luxspdbjjftvgqrp',     // SMTP user password
  },
});

// Register route 
router.post('/register', async (req, res) => { 
  const { name, mobile, email, password } = req.body; 
  const otp = crypto.randomInt(100000, 999999).toString();

  try {
    // Check if a user with the same email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Check if a user with the same mobile number already exists
    const existingUserByMobile = await UserDetails.findOne({ 'contact.mobile': mobile });
    if (existingUserByMobile) {
      return res.status(400).json({ message: 'Mobile number is already registered' });
    }

    // Encrypt password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a UserDetails document
    const userDetails = new UserDetails({
      name,
      contact: {
        mobile,
        email,
      }
    });
    const savedUserDetails = await userDetails.save();

    

    // Store the OTP in the database
    const myotp = new Otp({ email, otp });
    await myotp.save();

    // Create User 
    const user = new User({ 
      email, 
      password: hashedPassword, 
      userDetails: savedUserDetails._id, 
    });
    await user.save();

    // Send OTP to user's email using SMTP
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL, // Sender address
      to: email,
      subject: 'Verify Your Email',
      text: `Your OTP code is ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering user' });
  }
});


//Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log("Login request: ", req.body);

  try {
    const user = await User.findOne({ email });

    console.log("User found: ", user); // Log user object

    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.status == "inactive") return res.status(400).json({ message: 'Email not verified' });
    if (user.status == "suspended") return res.status(400).json({ message: 'Account Suspended' });


    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
   // Declare the name variable in the outer scope
   let name;

   if (user.role === 'user') {
     const userDetails = await UserDetails.findById(user.userDetails);
     name = userDetails.name;  // Assign the name from userDetails
   } else {
     name = "Vaibhav";  // Default name for non-user
   }
    

    const token = jwt.sign({ id: user._id, role:user.role, email:user.email, name}, JWT_SECRET, { expiresIn: '7h' });
    console.log("Generated token: ", token); // Log the generated token

    res.status(200).json({ token, user });
  } catch (error) {
    console.error("Login error: ", error);
    res.status(500).json({ message: 'Login failed' });
  }
});



// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  console.log(req.body)

  try {
    const otpDoc = await Otp.findOne({ email });
    const user = await User.findOne({ email });

    if (!otpDoc) return res.status(404).json({ message: 'User not found' });
    if (otpDoc.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    user.status = "active";
    await user.save();

    // OTP is valid, delete the record to prevent reuse
    await Otp.deleteOne({ email });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'OTP verification failed' });
  }
});

//reset otp started

// Forgot Password - Request OTP
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // For security, send the same response whether or not the email exists
      return res.status(200).json({ message: 'OTP has been sent to your email' });
    }

    //Check for otp exists
    const otpExist = await Otp.findOneAndDelete({email})
    console.log(otpExist)

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // // Hash the OTP before saving to the database
    // const  = crypto.createHash('sha256').update(otp).digest('hex');

    // Save OTP to database with an expiration time
    const otpEntry = new Otp({
      email,
      // otp: hashedOtp,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // OTP expires in 10 minutes
    });
    await otpEntry.save();

    // Send OTP via email
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL, // Sender address
      to: email,
      subject: 'Password Reset OTP',
      text: `Your password reset OTP is ${otp}. It will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'OTP has been sent to your email' });
  } catch (error) {
    console.error('Error in /forgot-password:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
});


// Reset Password - Verify OTP and Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {

    // Find the OTP entry
    const otpEntry = await Otp.findOne({ email, otp });
    if (!otpEntry) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP is expired
    if (otpEntry.expiresAt < Date.now()) {
      // Delete the expired OTP entry
      await Otp.deleteOne({ _id: otpEntry._id });
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      // For security, send a generic error message
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    user.password = hashedPassword;
    user.status = 'active'
    await user.save();

    // Delete the OTP entry
    await Otp.deleteOne({ _id: otpEntry._id });

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error in /reset-password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;