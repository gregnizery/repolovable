import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    try {
        await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle2' });
        console.log('Page loaded');
        // Let's log if BigCalendar is loaded there, but wait, the error is at /calendrier
        // Wait, to see the error on /calendrier, we'd need to login first. 
    } catch (e) {
        console.log('Navigation Error:', e);
    }
    await browser.close();
})();
