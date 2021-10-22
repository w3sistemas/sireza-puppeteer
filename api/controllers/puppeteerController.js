const config = require("config");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function startBrowser() {
    const browser = await puppeteer.launch({args: ['--no-sandbox']});
    const page = await browser.newPage();
    return {browser, page};
}

exports.get = async (req, res, next) => {
    res.sendFile(path.join(__dirname + '/destination.html'));
}

exports.post = async (req, res, next) => {
    try {
        console.log('iniciando browser');
        const {browser, page} = await startBrowser();

        await page.goto(config.get('salesforce.url'));

        console.log('realizando login');
        await page.waitForSelector(config.get('selectors.username'), {timeout: 10000});
        await page.click(config.get('selectors.username'));
        await page.keyboard.type(config.get('credentials.username'));

        await page.waitForSelector(config.get('selectors.password'), {timeout: 10000});
        await page.click(config.get('selectors.password'));
        await page.keyboard.type(config.get('credentials.password'));

        console.log('acessando pagina home');
        await page.click(config.get('selectors.login'));
        await page.waitForNavigation();

        console.log('acessando validacao em lote');
        await page.goto(config.get('salesforce.url_valid_lot'));

        console.log('iniciando consulta de cnpj');
        await page.waitForSelector(config.get('selectors.search'), {timeout: 10000});
        await page.click(config.get('selectors.search'));

        const docs = req.body;

        for (const key of Object.keys(docs)) {
            await page.keyboard.type(key);
        }

        await Promise.all([
            await page.click(config.get('selectors.search_button'))
        ]);

        console.log('aguardando resultados')
        await page.waitForSelector(config.get('selectors.table'), {timeout: 10000});

        console.log('gerando html')
        const bodyHTML = await page.evaluate(() => document.querySelector('*').outerHTML);

        console.log(bodyHTML)

        console.log('salvando html')
        fs.writeFile(path.join(__dirname + '/destination.html'), bodyHTML, function (err) {
            if (err) {
                console.log(err);
            }
        });

        await page.goto(`http://localhost:` + config.get('server.port') + `/result`);

        const results = await page.evaluate(() => {
            const array = [];
            const tables = document.querySelectorAll('table');
            for (a = 0; a < tables.length; a++) {
                for (b = 0; b < tables[a].children[1].childElementCount; b++) {
                    let document = tables[a].children[1].children[b].children[0].children[0].innerText;
                    let message = tables[a].children[1].children[b].children[1].children[0].innerText;
                    let products = tables[a].children[1].children[b].children[2].children[0].innerText;
                    let event = {document, message, products};
                    array.push(event);
                }
            }
            return array;
        },);

        for (a = 0; a < results.length; a++) {
            results[a].id = docs[results[a].document].id
            results[a].products = results[a].products.split("-");
        }

        fs.unlink(path.join(__dirname + '/destination.html'), function (err) {
            if (err) throw err;
            console.log('deletando resultados');
        });

        console.log('fechando browser');
        await browser.close();

        res.send(results);
    }
    catch (e) {
        return false;
    }
};