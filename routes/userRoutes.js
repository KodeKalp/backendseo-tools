const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  res.send('Hello user!');
});


module.exports = router;
