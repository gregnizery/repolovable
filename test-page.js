const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    try {
        await page.goto('http://localhost:4173/calendrier', { waitUntil: 'networkidle2' });
        console.log('Page loaded');
    } catch (e) {
        console.log('Navigation Error:', e);
    }
    await browser.close();
})();
