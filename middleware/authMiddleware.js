const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "defaultSecret";

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log(token)
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: 'Invalid or expired token. Please log in again.',
      logout: true, // Custom flag for frontend to interpret as a logout signal
      error: error.message
    });
  }
};

module.exports = authMiddleware;