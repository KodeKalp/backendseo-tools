const puppeteer = require('puppeteer'); // Import Puppeteer for headless browser scraping
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { parsePhoneNumberFromString } = require('libphonenumber-js');


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
        console.log("Scraping completed. Results:", BulkScrapperResult);
        return BulkScrapperResult;

    } catch (error) {
        console.error('Error during bulk scraping process:', error.message);
        throw new Error('Could not scrape emails');
    }
};