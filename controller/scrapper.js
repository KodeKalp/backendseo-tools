const puppeteer = require('puppeteer'); // Import Puppeteer for headless browser scraping
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
// const chromium = require("@sparticuz/chromium");



// Import your Mongoose models (adjust the path as needed)
const Site = require('../models/Site');
const FailedSite = require('../models/FailedSite');


const workingUrl = async (urls) => {
    try {
        if (urls.endsWith('/'))
            return urls.replace(/\/$/, "");

    } catch (error) {
        console.error("Error processing URLs:", error.message);
        throw error; // Rethrow the error to handle it in the calling function
    }
};


exports.scrapeEmails = async (url) => {
    try {
        // Ensure the URL has the proper protocol
        if (!/^https?:\/\//i.test(url)) {
            url = 'http://' + url;  // Add 'http://' if missing
        }
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);
        const data = await page.content(); // Get HTML after JavaScript is executed
        console.log(data);
        await browser.close();


        // Load HTML content into cheerio
        const $ = cheerio.load(data);

        // Define a more comprehensive email regex pattern
        const emailPattern = /([a-zA-Z0-9._%+-]+(?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9._%+-])?@[a-zA-Z0-9.-]+\.[a-z]{2,})/g;

        // Array to store valid emails
        const emails = [];


        $('a').each((i, element) => {
            const href = $(element).attr('href');
            if (href && href.startsWith('mailto')) {
                emails.push(href);
            }
            if (href && href.startsWith('Mailto')) {
                emails.push(href);
            }
        });

        // Scrape the page for email addresses
        $('body').each((i, element) => {
            const text = $(element).text(); // Get text content of the element
            const matches = text.match(emailPattern); // Match against regex

            // If matches are found, add them to the emails array
            if (matches) {
                matches.forEach((email) => {
                    if (!emails.includes(email)) {  // Avoid duplicate emails
                        emails.push(email);
                    }
                });
            }
        });

        const uniqueArray = [...new Set(emails)];


        // Return the list of unique emails found
        return uniqueArray;

    } catch (error) {
        console.error('Error scraping emails:', error.message);
        throw new Error('Could not scrape emails');
    }
};


exports.scrapeUrls = async (url) => {


    if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url;  // Add 'http://' if missing
    }
    // const { data } = await axios.get(url);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const data = await page.content(); // Get HTML after JavaScript is executed
    await browser.close();

    const $ = cheerio.load(data);
    const links = [];
    $('a').each((i, element) => {
        const href = $(element).attr('href');
        if (href && href.startsWith('http')) {
            links.push(href);
        }
        else if (href && href.startsWith('/')) {
            links.push(href.replace(/\//g, `${url}/`));
        }
    });
    const uniqueArray = [...new Set(links)];
    return uniqueArray;
};

exports.scrapePhoneNumbers = async (url) => {
    if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url;  // Add 'http://' if missing
    }
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const phoneNumbers = [];
    $('body').each((i, element) => {
        const text = $(element).text();
        const matches = text.match(/(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?[\d\s-]{5,15}/g);
        if (matches) {
            matches.forEach((match) => {
                const phone = parsePhoneNumberFromString(match);
                if (phone && phone.isValid()) {
                    phoneNumbers.push(phone.formatInternational());
                }
            });
        }
    });
    $('a').each((i, element) => {
        const text = $(element).attr('tel');
        // const matches = text.match(/(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?[\d\s-]{5,15}/g);
        if (text) {
            text.forEach((match) => {
                const phone = parsePhoneNumberFromString(match);
                if (phone && phone.isValid()) {
                    phoneNumbers.push(phone.formatInternational());
                }
            });
        }
    });
    const uniqueArray = [...new Set(phoneNumbers)];

    return uniqueArray;
};

exports.ScrapeAll = async (url) => {
    try {
        console.log("Starting scraping process for:", url);

        // Ensure URL has the proper protocol
        if (!/^https?:\/\//i.test(url)) {
            console.log(`URL missing protocol, adding 'http://' to: ${url}`);
            url = 'http://' + url;
        }

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            console.log(`Page loaded: ${url}`);

            const data = await page.content();
            const $ = cheerio.load(data);

            const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})/g;
            let emails = new Set();
            let phones = new Set();
            let urls = new Set();

            // Extract emails from 'mailto' links
            $('a[href^="mailto"]').each((_, element) => {
                const email = $(element).attr('href').replace('mailto:', '').trim();
                if (email) emails.add(email);
            });

            // Extract emails from page text
            $('body').each((_, element) => {
                const matches = $(element).text().match(emailPattern);
                if (matches) matches.forEach(email => emails.add(email));
            });

            // Extract phone numbers from text
            $('body').each((_, element) => {
                const matches = $(element).text().match(/(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?[\d\s-]{5,15}/g);
                if (matches) {
                    matches.forEach(match => {
                        const phone = parsePhoneNumberFromString(match);
                        if (phone && phone.isValid()) phones.add(phone.formatInternational());
                    });
                }
            });

            // Extract URLs from <a> tags
            $('a[href]').each((_, element) => {
                let href = $(element).attr('href');
                if (href.startsWith('http')) urls.add(href);
                else if (href.startsWith('/')) urls.add(new URL(href, url).href);
            });

            await page.close();
            await browser.close();

            console.log(`Scraping completed for ${url}`);
            return {
                url,
                emails: Array.from(emails),
                phones: Array.from(phones),
                urls: Array.from(urls)
            };
        } catch (err) {
            console.error(`Error while scraping ${url}:`, err.message);
            await page.close();
            await browser.close();
            throw new Error(`Failed to scrape ${url}`);
        }
    } catch (error) {
        console.error('Scraping process error:', error.message);
        throw new Error('Scraping failed');
    }
};



exports.bulkScrapeAll = async (urls) => {
    try {
        console.log("Starting bulk scraping process...");

        // Ensure all URLs have the proper protocol
        const formattedUrls = urls.map(url => {
            if (!/^https?:\/\//i.test(url)) {
                console.log(`URL missing protocol, adding 'http://' to: ${url}`);
                return 'http://' + url;  // Add 'http://' if missing
            }
            return url;
        });

        console.log(`Formatted URLs: ${formattedUrls}`);

        // Launch Puppeteer once
        const browser = await puppeteer.launch({ headless: true }); // Headless mode for better performance
        const BulkScrapperResult = [];
        console.log('Puppeteer browser launched.');

        // Scrape each URL sequentially
        for (let url of formattedUrls) {
            console.log(`Scraping URL: ${url}`);

            const page = await browser.newPage(); // Open a new page within the same browser
            console.log(`New page created for URL: ${url}`);

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded' }); // Wait for DOM to load
                console.log(`Page loaded for: ${url}`);

                const data = await page.content(); // Get HTML after JavaScript is executed
                console.log(`HTML content fetched for: ${url}`);

                // Load HTML content into cheerio
                const $ = cheerio.load(data);

                // Define a comprehensive email regex pattern
                const emailPattern = /([a-zA-Z0-9._%+-]+(?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9._%+-])?@[a-zA-Z0-9.-]+\.[a-z]{2,})/g;
                console.log(`Using email regex pattern`);

                // Array to store emails found on this page
                let pageEmails = [];
                let pageUrl = [];
                let pagePhone = [];


                // Scrape the page for "mailto" links
                $('a[href^="mailto"]').each((i, element) => {
                    const mailto = $(element).attr('href').toLowerCase();
                    const email = mailto.replace('mailto:', '').trim();
                    if (email && !pageEmails.includes(email)) {
                        pageEmails.push(email);
                        console.log(`Found email via 'mailto': ${email}`);
                    }
                });



                // Scrape the page for text-based emails using regex
                $('body').each((i, element) => {
                    const text = $(element).text(); // Get text content of the element
                    const matches = text.match(emailPattern); // Match against regex

                    // If matches are found, add them to the pageEmails array
                    if (matches) {
                        matches.forEach((email) => {
                            if (!pageEmails.includes(email)) {  // Avoid duplicate emails
                                pageEmails.push(email);
                                console.log(`Found email via regex: ${email}`);
                            }
                        });
                    }
                });

                $('body').each((i, element) => {
                    const text = $(element).text();
                    const matches = text.match(/(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?[\d\s-]{5,15}/g);
                    if (matches) {
                        matches.forEach((match) => {
                            const phone = parsePhoneNumberFromString(match);
                            if (phone && phone.isValid()) {
                                pagePhone.push(phone.formatInternational());
                            }
                        });
                    }
                });

                $('a').each((i, element) => {
                    const text = $(element).attr('tel');
                    // const matches = text.match(/(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?[\d\s-]{5,15}/g);
                    if (text) {
                        text.forEach((match) => {
                            const phone = parsePhoneNumberFromString(match);
                            if (phone && phone.isValid()) {
                                pagePhone.push(phone.formatInternational());
                            }
                        });
                    }
                });

                $('a').each((i, element) => {
                    const href = $(element).attr('href');
                    if (href && href.startsWith('http')) {
                        pageUrl.push(href);
                    }
                    else if (href && href.startsWith('/')) {
                        pageUrl.push(href.replace(/\//g, `${url}/`));
                    }
                });

                //if pageEmails are empty then try to find contact, contact-us, connect page from url 
                if (pageEmails.length <2) {
                    console.log(`No emails found on ${url}. Searching for a contact page...`);

                    const contactPageLinks = [];

                    for (const element of $('a').toArray()) {
                        const href = $(element).attr('href');

                        if (href && /(contactus|contact|contact-us|connect|write-for-us|about|about-us|terms-of-service|policy|support|advertising|advertise|advertise-techcentral|advertise-|cookie)/i.test(href)) {
                            const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;

                            try {
                                console.log(`Checking contact page: ${fullUrl}`);

                                const response = await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });

                                // Check if the page is a 404 error
                                if (response.status() === 404) {
                                    console.log(`Skipping ${fullUrl}, as it returned a 404 error.`);
                                    continue; // Skip adding this URL
                                }

                                // Only add valid pages
                                contactPageLinks.push(fullUrl);
                                console.log(`Added valid contact page: ${fullUrl}`);

                            } catch (err) {
                                console.error(`Error checking contact page ${fullUrl}:`, err.message);
                            }
                        }
                    }


                    console.log(`Found contact page links: ${contactPageLinks}`);

                    for (let contactUrl of contactPageLinks) {
                        try {
                            console.log(`Visiting contact page: ${contactUrl}`);
                            await page.goto(contactUrl, { waitUntil: 'domcontentloaded' });
                            const contactPageContent = await page.content();
                            const $contact = cheerio.load(contactPageContent);

                            // Extract emails from the contact page
                            $contact('body').each((i, element) => {
                                const text = $contact(element).text();
                                const matches = text.match(emailPattern);
                                if (matches) {
                                    matches.forEach((email) => {
                                        if (!pageEmails.includes(email)) {
                                            pageEmails.push(email);
                                            console.log(`Found email on contact page: ${email}`);
                                        }
                                    });
                                }
                            });

                            // Stop searching if an email is found
                            if (pageEmails.length > 0) break;

                        } catch (err) {
                            console.error(`Error visiting contact page ${contactUrl}:`, err.message);
                        }
                    }
                }

                // Add unique emails from this URL to the global email results
                BulkScrapperResult.push({
                    url,
                    emails: [...new Set(pageEmails)],  // Ensure unique emails
                    urls: [...new Set(pageUrl)],
                    phones: [...new Set(pagePhone)]
                });

                console.log(`Scraping completed for URL: ${url}. Found emails: ${pageEmails.length}`);


            } catch (err) {
                console.error(`Error while scraping URL ${url}:`, err.message);
            }

            await page.close(); // Close the page after scraping
            console.log(`Page closed for URL: ${url}`);
        }

        // Close the browser after scraping all URLs
        await browser.close();
        console.log('Puppeteer browser closed after scraping all URLs.');

        // Final results
        // console.log("Scraping completed. Results:", BulkScrapperResult);
        console.log("Scraping completed. Results:");
        return BulkScrapperResult;

    } catch (error) {
        console.error('Error during bulk scraping process:', error.message);
        throw new Error('Could not scrape emails');
    }
};




exports.myBulkScrapeAll = async (urls) => {
    try {
        console.log("Starting bulk scraping process...");

        // Ensure all URLs have the proper protocol
        const formattedUrls = urls.map(url => {
            if (!/^https?:\/\//i.test(url)) {
                console.log(`URL missing protocol, adding 'http://' to: ${url}`);
                return 'https://' + url;  // Add 'http://' if missing
            }
            return url;
        });
        console.log(`Formatted URLs: ${formattedUrls}`);

        // Launch Puppeteer once (headless for performance)
        const browser = await puppeteer.launch({ headless: true });
        const BulkScrapperResult = [];
        console.log('Puppeteer browser launched.');

        // Process each URL sequentially
        for (let url of formattedUrls) {
            console.log(`\nScraping URL: ${url}`);
            const page = await browser.newPage();
            console.log(`New page created for URL: ${url}`);

            // Initialize arrays to hold scraped data
            let pageEmails = [];
            let pageUrl = [];
            let pagePhone = [];

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                console.log(`Page loaded for: ${url}`);

                const data = await page.content();
                console.log(`HTML content fetched for: ${url}`);

                // Load HTML into cheerio
                const $ = cheerio.load(data);

                // Define a comprehensive email regex pattern
                const emailPattern = /([a-zA-Z0-9._%+-]+(?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9._%+-])?@[a-zA-Z0-9.-]+\.[a-z]{2,})/g;
                console.log(`Using email regex pattern`);

                // 1. Scrape emails from "mailto" links
                $('a[href^="mailto"]').each((i, element) => {
                    const mailto = $(element).attr('href').toLowerCase();
                    const email = mailto.replace('mailto:', '').trim();
                    if (email && !pageEmails.includes(email)) {
                        pageEmails.push(email);
                        console.log(`Found email via 'mailto': ${email}`);
                    }
                });

                // 2. Scrape emails from text using regex
                $('body').each((i, element) => {
                    const text = $(element).text();
                    const matches = text.match(emailPattern);
                    if (matches) {
                        matches.forEach((email) => {
                            if (!pageEmails.includes(email)) {
                                pageEmails.push(email);
                                console.log(`Found email via regex: ${email}`);
                            }
                        });
                    }
                });

                // 3. Scrape phone numbers from text
                $('body').each((i, element) => {
                    const text = $(element).text();
                    const matches = text.match(/(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?[\d\s-]{5,15}/g);
                    if (matches) {
                        matches.forEach((match) => {
                            const phone = parsePhoneNumberFromString(match);
                            if (phone && phone.isValid()) {
                                pagePhone.push(phone.formatInternational());
                            }
                        });
                    }
                });

                // 4. Scrape phone numbers from "tel" attributes on <a> tags
                $('a').each((i, element) => {
                    const telAttr = $(element).attr('tel');
                    if (telAttr) {
                        const phone = parsePhoneNumberFromString(telAttr);
                        if (phone && phone.isValid()) {
                            pagePhone.push(phone.formatInternational());
                        }
                    }
                });

                // 5. Scrape additional URLs from <a> tags (absolute or relative)
                $('a').each((i, element) => {
                    const href = $(element).attr('href');
                    if (href && href.startsWith('http')) {
                        pageUrl.push(href);
                    } else if (href && href.startsWith('/')) {
                        try {
                            const fullUrl = new URL(href, url).href;
                            pageUrl.push(fullUrl);
                        } catch (error) {
                            console.error(`Error constructing URL from ${href} with base ${url}:`, error.message);
                        }
                    }
                });

                // 6. If few emails found, search for a contact page
                if (pageEmails.length < 2) {
                    console.log(`Few emails found on ${url}. Searching for a contact page...`);

                    const contactPageLinks = [];

                    // Find links that may point to a contact (or similar) page
                    $('a').each((i, element) => {
                        const href = $(element).attr('href');
                        if (href && /(contactus|contact|contact-us|connect|write-for-us|about|about-us|terms-of-service|policy|support|advertising|advertise|advertise-techcentral|advertise-|cookie)/i.test(href)) {
                            const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
                            contactPageLinks.push(fullUrl);
                        }
                    });

                    console.log(`Found contact page links: ${contactPageLinks}`);

                    // Visit each contact page until an email is found
                    for (let contactUrl of contactPageLinks) {
                        try {
                            console.log(`Visiting contact page: ${contactUrl}`);
                            await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                            const contactPageContent = await page.content();
                            const $contact = cheerio.load(contactPageContent);

                            $contact('body').each((i, element) => {
                                const text = $contact(element).text();
                                const matches = text.match(emailPattern);
                                if (matches) {
                                    matches.forEach((email) => {
                                        if (!pageEmails.includes(email)) {
                                            pageEmails.push(email);
                                            console.log(`Found email on contact page: ${email}`);
                                        }
                                    });
                                }
                            });

                            // If any email is found, break out of the loop
                            if (pageEmails.length > 0) break;
                        } catch (err) {
                            console.error(`Error visiting contact page ${contactUrl}:`, err.message);
                        }
                    }
                }

            } catch (err) {
                console.error(`Error while scraping URL ${url}:`, err.message);
            }

            // Determine if scraping was successful (i.e. at least one email found)
            const uniqueEmails = [...new Set(pageEmails)];
            const scrapingSuccess = uniqueEmails.length > 0;
 
            // Update the database accordingly
            try {
                if (scrapingSuccess) {
                    // Save a successful scrape in the Site collection (store the first email found)
                    const siteDoc = new Site({
                        url: url,
                        email: uniqueEmails[0],
                        status: true
                    });
                    await siteDoc.save();
                    console.log(`Database updated for URL ${url} as success.`);
                } else {
                    // Save a failure in the Site collection and add to FailedSite for reprocessing
                    const siteDoc = new Site({
                        url: url,
                        email: '',
                        status: false
                    });
                    await siteDoc.save();
                    console.log(`Database updated for URL ${url} as failure.`);

                    const failedSite = new FailedSite({ url });
                    await failedSite.save();
                    console.log(`URL ${url} added to FailedSite for reprocessing.`);
                }
            } 
            catch (dbError) {
                console.error(`Database error for URL ${url}:`, dbError.message);
            }

            // Push the result from this URL into the global results array
            BulkScrapperResult.push({
                url: url,
                emails: uniqueEmails,
                urls: [...new Set(pageUrl)],
                phones: [...new Set(pagePhone)]
            });

            await page.close();
            console.log(`Page closed for URL: ${url}`);
        }

        // Close the browser after processing all URLs
        await browser.close();
        console.log('Puppeteer browser closed after scraping all URLs.');
        console.log("Scraping completed. Results:");
        return BulkScrapperResult;

    } catch (error) {
        console.error('Error during bulk scraping process:', error.message);
        throw new Error('Could not scrape emails');
    }
};
