import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const slackWebhook = process.env.SLACK_WEBHOOK_URL;
const emailSettings = {
  host: process.env.EMAIL_SMTP_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS
  }
};
const notifyEmail = process.env.EMAIL_TO;

async function notify(subject, message) {
  if (slackWebhook) {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*${subject}*\n${message}` })
    });
  }
  if (emailSettings.host) {
    const transporter = nodemailer.createTransport(emailSettings);
    await transporter.sendMail({
      from: `"Form Tester" <${emailSettings.auth.user}>`,
      to: notifyEmail,
      subject,
      text: message
    });
  }
}

async function testForm() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const url = 'https://www.alliant.edu/request-information';

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // STEP 1
    await page.type('#edit-submitted-first-name', 'Test');
    await page.type('#edit-submitted-last-name', 'User');
    await page.type('#edit-submitted-email', `test+${Date.now()}@example.com`);
    await page.type('#edit-submitted-phone', '1234567890');
    await Promise.all([
      page.click('input#edit-next'),
      page.waitForSelector('#edit-submitted-campus')
    ]);

    // STEP 2
    await page.select('#edit-submitted-campus', 'San Diego');
    await page.select('#edit-submitted-program-of-interest', 'MBA');
    await Promise.all([
      page.click('input#edit-next'),
      page.waitForSelector('#edit-submitted-preferred-start-term')
    ]);

    // STEP 3
    await page.select('#edit-submitted-preferred-start-term', 'Fall 2025');
    await Promise.all([
      page.click('input#edit-actions-submit'),
      page.waitForNavigation({ timeout: 10000 })
    ]);
  } catch (err) {
    console.error('Error during form test:', err);
    await notify(
      '🔥 Alliant Form Test Failed',
      `Error:\n\n${err.stack}`
    );
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testForm();
