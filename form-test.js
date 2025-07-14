import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { setTimeout } from 'node:timers/promises';

dotenv.config();

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

async function testHomepageForm(page) {
	const url = 'https://www.alliant.edu';
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

		await setTimeout(1000);

		await scrollAndClick(page, 'input.button--submit-final[type="submit"]');
		await page.waitForNavigation({ timeout: 10000 });

		if (!page.url().includes('/thank-you')) {
			throw new Error(`Unexpected redirect: ${page.url()}`);
		}

		console.log('Homepage form submitted successfully.');
	} catch (err) {
		throw new Error(`Homepage form failed: ${err.message}`);
	}
}

async function testRequestInfoForm(page) {
	const url = 'https://www.alliant.edu/request-information';
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

		await setTimeout(1000);

		await scrollAndClick(page, 'input.button--submit-final[type="submit"]');
		await page.waitForNavigation({ timeout: 10000 });

		if (!page.url().includes('/thank-you')) {
			throw new Error(`Unexpected redirect: ${page.url()}`);
		}

		console.log('Request info form submitted successfully.');
	} catch (err) {
		throw new Error(`Request info form failed: ${err.message}`);
	}
}

async function testPaidMediaLandingPageHome(page) {
	const url = 'https://info.alliant.edu/';
	try {
		await page.goto(url, { waitUntil: 'networkidle2' });

		await page.type('input[name="firstName"]', `test${Date.now()}`);
		await page.type('input[name="lastName"]', 'test');
		await page.type('input[name="email"]', `mikeautotest@yopmail.com`);
		await page.type('input[name="phone"]', '7605629999');
		await page.select('select[name="Major__c_contact"]', 'Business Administration (DBA)');
		await page.select('select[name="Campus__c_lead"]', 'San Diego');
		await page.select('select[name="Are_you_an_international_student__c"]', 'No');
		await page.type('input[name="Zip__c"]', '92108');
		await page.select('select[name="Served_in_the_U_S_military__c_lead"]', 'No');

		await setTimeout(1000);
		await page.click('button[type="submit"]');
		await page.waitForNavigation({ timeout: 15000 });

		if (!page.url().includes('/thank-you-confirmation')) {
			throw new Error(`Unexpected redirect: ${page.url()}`);
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

	await page.setViewport({
		width: 1920,
		height: 1080,
		deviceScaleFactor: 1,
	});

	try {
		await testHomepageForm(page);
	} catch (err) {
		failures.push(`❌ Homepage: ${err.message}`);
	}

	try {
		await testRequestInfoForm(page);
	} catch (err) {
		failures.push(`❌ Request Info: ${err.message}`);
	}

	try {
		await testPaidMediaLandingPageHome(page);
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
