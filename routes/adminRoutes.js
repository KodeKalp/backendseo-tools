const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const fs = require('fs');
const { scrapeEmails, scrapeUrls, scrapePhoneNumbers, bulkScrapeAll, myBulkScrapeAll } = require('../controller/scrapper');
const Site = require('../models/Site');




// Helper functions



// Routes


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
    console.log()
    // const  = await scrapePhoneNumbers(req.body.url);
    // const urls = await scrapeUrls(req.body.url);
    // const emails = await scrapeEmails(req.body.url);
     const [url, emails, phoneNumbers, urls]  = await ScrapeAll(req.body.url)
               

    res.json({ phoneNumbers, urls, emails, url });
  } catch (err) {
    res.status(500).json({ message: 'Error scraping phone numbers', error: err.message });
  }
});

router.get('/admin-dashboard', authMiddleware, roleMiddleware(['admin', 'doctor']), (req, res) => {
  res.status(200).json({ message: 'Admin dashboard data' });
});





router.post('/bulk-scrape/all', body('urls').isArray(), async (req, res) => {
  const errors = validationResult(req);
  console.log("bulk scraper started")
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
  
    const result = await bulkScrapeAll(req.body.urls)
    res.json( result );
  } catch (err) {
    res.status(500).json({ message: 'Error scraping data', error: err.message });
  }
});

// POST /api/scrape/bulk
// Expects: { urls: [ "https://example.com", "https://anotherdomain.com", ... ] }
router.post('/bulk', async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'urls must be provided as an array' });
  }

  try {
      const results = await myBulkScrapeAll(urls);
      res.status(200).json({ message: 'Scraping completed', results });
  } catch (error) {
      console.error('Error in bulk scrape route:', error.message);
      res.status(500).json({ error: 'Internal server error' });
  }
});
// Fetch all sites
router.get('/sites', async (req, res) => {
  try {
    const sites = await Site.find();
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
