const puppeteer = require('puppeteer');

async function testHomepageForm() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Testing homepage form...');
    await page.goto('https://www.alliant.edu', { waitUntil: 'networkidle2' });

    // Adjust selectors as needed — below is an example
    await page.type('input[name="first_name"]', 'Test');
    await page.type('input[name="last_name"]', 'User');
    await page.type('input[name="email"]', 'test@example.com');
    await page.type('input[name="phone"]', '1234567890');

    // Submit form (adjust selector)
    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000); // Wait for form submission
    console.log('Homepage form tested successfully.');
  } catch (err) {
    console.error('Error testing homepage form:', err);
  } finally {
    await browser.close();
  }
}

async function testRequestInfoForm() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Testing request info form...');
    await page.goto('https://www.alliant.edu/request-information', { waitUntil: 'networkidle2' });

    await page.type('input[name="first_name"]', 'Test');
    await page.type('input[name="last_name"]', 'User');
    await page.type('input[name="email"]', 'test@example.com');
    await page.type('input[name="phone"]', '1234567890');

    // Submit form (adjust selector)
    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000); // Wait for form submission
    console.log('Request info form tested successfully.');
  } catch (err) {
    console.error('Error testing request info form:', err);
  } finally {
    await browser.close();
  }
}

(async () => {
  await testHomepageForm();
  await testRequestInfoForm();
})();
