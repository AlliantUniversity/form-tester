/* eslint-disable no-await-in-loop */
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import dotenvFlow from 'dotenv-flow';
import { setTimeout } from 'node:timers/promises';

import { parameters } from './includes/test-data.js';

dotenvFlow.config();

const slackWebhook = process.env.SLACK_WEBHOOK_URL;
const emailSettings = {
	host: process.env.EMAIL_SMTP_HOST,
	port: process.env.EMAIL_SMTP_PORT,
	auth: {
		user: process.env.EMAIL_SMTP_USER,
		pass: process.env.EMAIL_SMTP_PASS,
	},
};
const notifyEmail = process.env.EMAIL_TO;

const pacificFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: 'America/Los_Angeles',
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
	second: 'numeric',
	hour12: true,
});

async function notify(subject, message) {
	if (slackWebhook) {
		await fetch(slackWebhook, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: `*${subject}*\n${message}` }),
		});
	}
	if (emailSettings.host) {
		const transporter = nodemailer.createTransport(emailSettings);
		await transporter.sendMail({
			from: `"Form Tester" <${emailSettings.auth.user}>`,
			to: notifyEmail,
			subject,
			text: message,
		});
	}
}

// Helper to scroll into view and click a button safely
async function scrollAndClick(page, selector) {
	await page.waitForSelector(selector, { visible: true, timeout: 5000 });
	const button = await page.$(selector);

	if (button) {
		await button.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
		await page.waitForFunction(
			(sel) => {
				const el = document.querySelector(sel);
				if (!el) return false;
				const rect = el.getBoundingClientRect();
				return (
					rect.width > 0 &&
					rect.height > 0 &&
					window.getComputedStyle(el).visibility !== 'hidden'
				);
			},
			{ timeout: 5000 },
			selector,
		);
		await button.evaluate((el) => el.click());
	} else {
		throw new Error(`Button not found for selector: ${selector}`);
	}
}

async function checkHiddenInputs(page, inputAttribute = 'name') {
	// for each object in parameters object, check the key for input with that class and the value for the key.
	for (const [key, value] of Object.entries(parameters)) {
		const input = await page.$(`input[${inputAttribute}*="${key.toLowerCase()}"]`);
		if (!input) {
			throw new Error(`Input not found for key: ${key}`);
		}
		const inputValue = await page.evaluate((field) => field.value, input);

		if (inputValue !== value) {
			throw new Error(
				`Input value mismatch for ${key}: expected ${value}, got ${inputValue}`,
			);
		}
	}
}

async function testMainSiteForm(page, url) {
	try {
		await page.goto(url, { waitUntil: 'networkidle2' });

		// Step 1
		await page.select('#edit-area-of-study', 'Psychology and Mental Health');
		await page.select('#edit-degree-pmh', 'Master of Arts');
		await page.select('#edit-major-pmh-master-of-arts', 'Clinical Counseling (MA)');
		await page.select('#edit-campus-pmh-clinical-counseling-ma', 'Online');

		await setTimeout(1000);

		await page.click('input#edit-actions-wizard-next');
		await page.waitForSelector('input[name="first_name"]', { timeout: 20000 });

		// Step 2
		await page.type('input[name="first_name"]', `test${Date.now()}`);
		await page.type('input[name="last_name"]', 'test');
		await page.type('input[name="email"]', `mikeautotest@yopmail.com`);
		await page.type('input[name="mobile_number"]', '7605629999');
		await page.type('input[name="zip_code"]', '92108');
		await page.waitForResponse(
			(response) => {
				return response.url().includes('/api/zipcodes') && response.status() === 200;
			},
			{ timeout: 5000 },
		);

		const city = await page.$eval('input[name="city"]', (field) => field.value);
		const state = await page.$eval('input[name="state"]', (field) => field.value);
		if (city !== 'San Diego' || state !== 'CA') {
			throw new Error(`Unexpected hidden field values: city=${city}, state=${state}`);
		}

		await checkHiddenInputs(page);

		await setTimeout(1000);

		await scrollAndClick(page, 'input.button--submit-final[type="submit"]');
		await page.waitForNavigation({ timeout: 10000 });

		if (!page.url().includes('/thank-you')) {
			throw new Error(`Unexpected redirect: ${page.url()}`);
		}

		console.log(`Main site form submitted successfully. ${url}`);
	} catch (err) {
		throw new Error(`Main site form failed ${url}: ${err.message}`);
	}
}

async function testPaidMediaLandingPageHome(page, url) {
	try {
		await page.goto(url, { waitUntil: 'networkidle2' });

		await page.type('input.first-name', `test${Date.now()}`);
		await page.type('input.last-name', 'test');
		await page.type('input.email', `mikeautotest@yopmail.com`);
		await page.type('input.phone-number', '7605629999');
		await page.type('input.zip-code', '92108');
		await page.waitForResponse(
			(response) => {
				return response.url().includes('/api/zipcodes') && response.status() === 200;
			},
			{ timeout: 5000 },
		);

		const city = await page.$eval('input.city', (field) => field.value);
		const state = await page.$eval('input.state', (field) => field.value);
		if (city !== 'San Diego' || state !== 'CA') {
			throw new Error(`Unexpected hidden field values: city=${city}, state=${state}`);
		}

		await page.select('select.area-of-study', 'Education');
		await page.select(
			'select.choose-a-program:not([disabled])',
			'Administrative Services Credential',
		);
		await page.select('select.campus:not([disabled])', 'Online');
		// await page.select('select[name="Are_you_an_international_student__c"]', 'No');
		// await page.select('select[name="Served_in_the_U_S_military__c_lead"]', 'No');

		await checkHiddenInputs(page, 'class');

		await setTimeout(1000);

		await page.click('input.gform_button.button[type="submit"]');
		await page.waitForNavigation({ timeout: 15000 });

		if (!page.url().includes('/thank-you-confirmation')) {
			throw new Error(`Unexpected submit redirect: ${page.url()}`);
		}

		console.log('PM LP form submitted successfully.');
	} catch (err) {
		throw new Error(`PM LP form failed: ${err.message}`);
	}
}

async function runTests() {
	const failures = [];
	const isCI = process.env.CI === 'true';
	const browser = await puppeteer.launch({
		headless: process.env.HEADLESS !== 'false',
		args: isCI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
	});
	const page = await browser.newPage();
	const searchParams = new URLSearchParams(parameters);

	await page.setViewport({
		width: 1920,
		height: 1080,
		deviceScaleFactor: 1,
	});

	try {
		const mainSiteHomePageURL = `https://www.alliant.edu/?${searchParams.toString()}`;
		await testMainSiteForm(page, mainSiteHomePageURL);
	} catch (err) {
		failures.push(`❌ Homepage: ${err.message}`);
	}

	try {
		const mainSiteRFIPageURL = `https://www.alliant.edu/request-information?${searchParams.toString()}`;
		await testMainSiteForm(page, mainSiteRFIPageURL);
	} catch (err) {
		failures.push(`❌ Request Info: ${err.message}`);
	}

	try {
		const paidMediaSiteHomePageURL = `https://info.alliant.edu/?${searchParams.toString()}`;
		await testPaidMediaLandingPageHome(page, paidMediaSiteHomePageURL);
	} catch (err) {
		failures.push(`❌ Paid Media LP: ${err.message}`);
	}

	if (failures.length > 0) {
		await notify(
			'🔥 Form Test Failures',
			`Some form tests failed on ${pacificFormatter.format(new Date())} PT:\n\n${failures.join('\n\n')}`,
		);
		throw new Error('One or more form tests failed');
	} else {
		console.log('All forms tested successfully.');

		if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
			await notify(
				'✅ Alliant Form Test Passed (Manual Run)',
				`All form tests passed successfully on ${pacificFormatter.format(new Date())} PT.`,
			);
		}
	}

	await browser.close();
}

runTests();
