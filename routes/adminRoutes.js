const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const fs = require('fs');
const { scrapeEmails, scrapeUrls, scrapePhoneNumbers, bulkScrapeAll } = require('../controller/scrapper');




// Helper functions



// Routes
router.post('/scrape/email', body('url').isURL(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const emails = await scrapeEmails(req.body.url);
    res.json({ emails });
    console.log(emails)
  } catch (err) {
    res.status(500).json({ message: 'Error scraping emails', error: err.message });
  }
});

router.post('/scrape/url', body('url').isURL(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const urls = await scrapeUrls(req.body.url);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ message: 'Error scraping URLs', error: err.message });
  }
});

router.post('/scrape/phone', body('url').isURL(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const phoneNumbers = await scrapePhoneNumbers(req.body.url);
    res.json({ phoneNumbers });
  } catch (err) {
    res.status(500).json({ message: 'Error scraping phone numbers', error: err.message });
  }
});

router.post('/scrape/all', body('url').isURL(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const phoneNumbers = await scrapePhoneNumbers(req.body.url);
    const urls = await scrapeUrls(req.body.url);
    const emails = await scrapeEmails(req.body.url);

    res.json({ phoneNumbers, urls, emails });
  } catch (err) {
    res.status(500).json({ message: 'Error scraping phone numbers', error: err.message });
  }
});

router.get('/admin-dashboard', authMiddleware, roleMiddleware(['admin', 'doctor']), (req, res) => {
  res.status(200).json({ message: 'Admin dashboard data' });
});

router.post('/bulk-scrape/email', body('urls').isArray(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const results = await Promise.all(req.body.urls.map(url => scrapeEmails(url)));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: 'Error scraping emails', error: err.message });
  }
});

router.post('/bulk-scrape/url', body('urls').isArray(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const results = await Promise.all(req.body.urls.map(url => scrapeUrls(url)));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: 'Error scraping URLs', error: err.message });
  }
});

router.post('/bulk-scrape/phone', body('urls').isArray(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const results = await Promise.all(req.body.urls.map(url => scrapePhoneNumbers(url)));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: 'Error scraping phone numbers', error: err.message });
  }
});

router.post('/bulk-scrape/all', body('urls').isArray(), async (req, res) => {
  const errors = validationResult(req);
  console.log("bulk scraper started")
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // const results = await Promise.all(req.body.urls.map(async (url) => {
    //   const phoneNumbers = await scrapePhoneNumbers(url);
    //   const urls = await scrapeUrls(url);
    //   const emails = await scrapeEmails(url);
    //   return { phoneNumbers, urls, emails };
    // }));
    const result = await bulkScrapeAll(req.body.urls)
    res.json( result );
  } catch (err) {
    res.status(500).json({ message: 'Error scraping data', error: err.message });
  }
});


module.exports = router;
