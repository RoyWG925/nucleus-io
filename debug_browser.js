const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    let logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', error => logs.push(`[pageerror] ${error.message}`));

    console.log("Navigating to http://localhost:3001...");
    try {
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle0', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log("--------------- CONSOLE LOGS ---------------");
        logs.forEach(l => console.log(l));
        console.log("--------------------------------------------");
    } catch (e) {
        console.log("Navigation failed or timed out. Logs so far:");
        logs.forEach(l => console.log(l));
    }
    await browser.close();
})();
