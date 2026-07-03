const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const requestCounts = {};
  page.on('request', request => {
    const url = request.url();
    requestCounts[url] = (requestCounts[url] || 0) + 1;
  });

  await page.goto('https://novavastra.samrudhakshirsagar.tech', { waitUntil: 'networkidle2' });
  
  console.log("Waiting 5 seconds to track background requests...");
  await new Promise(r => setTimeout(r, 5000));
  
  console.log("Request summary:");
  for (const [url, count] of Object.entries(requestCounts)) {
    if (count > 1) {
      console.log(`[${count}x] ${url}`);
    }
  }
  
  await browser.close();
})();
