const config = require("config");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

exports.page = (async function (req, res) {
    res.sendFile(path.join(__dirname + '/document.html'));
});

exports.validateLot = (async function (req, res) {
    const browser = await puppeteer.launch({args: ['--no-sandbox']});
    //const browser = await puppeteer.launch({ headless: false });

    try {
        let startTime = new Date();
        console.log('--------------iniciando processo--------------');
        console.log(startTime);
        console.log('iniciando browser');
        const page = await browser.newPage();

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

        let docs = req.body;

        for(var attributename in docs){
            await page.keyboard.type(docs[attributename].documento)
        }

        await Promise.all([
            await page.click(config.get('selectors.search_button'))
        ]);

        console.log('aguardando resultados')
        await page.waitForSelector(config.get('selectors.table'));

        console.log('salvando html')
        let bodyHTML = await page.evaluate(() => document.querySelector('*').innerHTML);

        fs.writeFile(path.join(__dirname + '/destination.html'), bodyHTML, function (err) {
            if (err) {
                console.log(err);
            }
        });

        console.log('acessando html')
        await page.goto(`http://localhost:` + config.get('server.port') + `/page/?r=destination`);

        const results = await page.evaluate(() => {
            let array = [];
            let tables = document.querySelectorAll('table');
            for (let a = 0; a < tables.length; a++) {
                for (let b = 0; b < tables[a].children[1].childElementCount; b++) {
                    let document = tables[a].children[1].children[b].children[0].children[0].innerText;
                    let message = tables[a].children[1].children[b].children[1].children[0].innerText;
                    let products = tables[a].children[1].children[b].children[2].children[0].innerText;
                    let event = {document, message, products};
                    array.push(event);
                }
            }
            return array;
        },);

        for (let i = 0; i < results.length; i++) {
            results[i].products = results[i].products.split("-");
        }

        console.log('fechando browser');

        fs.unlink(path.join(__dirname + '/destination.html'), function (err) {
            if (err) throw err;
            let endTime = new Date();
            console.log('deletando html');
            console.log(endTime);
            console.log('--------------encerrando processo-------------');
        });

        res.send(results);

        await page.close();
        await browser.close();
    }
    catch (err) {
        console.error('error', err.message);
    } finally {
        await browser.close();
    }
});

exports.validateAlone = (async function (req, res) {
    const browser = await puppeteer.launch({args: ['--no-sandbox']});
    //const browser = await puppeteer.launch({ headless: false });

    try {
        let startTime = new Date();
        console.log('--------------iniciando processo--------------');
        console.log(startTime);
        console.log('iniciando browser');
        const page = await browser.newPage();

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

        console.log('acessando validacao');
        await page.goto(config.get('salesforce.url_valid_alone'));

        console.log('iniciando consulta de cnpj');
        await page.waitForSelector(config.get('selectors.search'), {timeout: 10000});
        await page.click(config.get('selectors.search'));

        let docs = req.body;

        let array = [];

        for(let attributeName in docs) {
            try {

                await page.keyboard.type(docs[attributeName].documento);

                await Promise.all([
                    await page.keyboard.press('Enter')
                ]);

                console.log('aguardando resultados');

                await page.waitForSelector(config.get('selectors.result_alone_true'), {timeout:10000})

                console.log('salvando html')

                let bodyHTML = await page.evaluate(() => document.querySelector('*').innerHTML);

                fs.writeFile(path.join(__dirname + '/document.html'), bodyHTML, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });

                console.log('acessando html')

                const pageHtml = await browser.newPage()

                await pageHtml.goto(`http://localhost:` + config.get('server.port') + `/page`);

                let textMessage = await pageHtml.evaluate(() => document.querySelector('body > div.themeLayoutStarterWrapper.isHeroUnderHeader-false.isHeaderPinned-false.siteforceThemeLayoutStarter > div.body.isPageWidthFixed-true > div > div.slds-col--padded.contentRegion.comm-layout-column > div > div > c-e-x-p_-valida-integration-brazil-l-w-c > div > lightning-layout > slot > div > lightning-layout-item.cnpjframe.slds-col.slds-size_12-of-12.slds-large-size_4-of-12 > slot > div:nth-child(2) > lightning-card > article > div.slds-card__body > slot > div > div > div > p').innerHTML);

                const hrefs = await pageHtml.evaluate(
                    () => Array.from(
                        document.querySelectorAll('.slds-tile__title.slds-truncate'),
                        a => a.getAttribute('title')
                    )
                );

                let document = docs[attributeName].documento;
                let message = textMessage;
                let products = hrefs;
                let event = {document, message, products};
                array.push(event);

                fs.unlink(path.join(__dirname + '/document.html'), function (err) {
                    if (err) throw err;
                    let endTime = new Date();
                    console.log('deletando html');
                    console.log(endTime);
                    console.log('--------------encerrando processo-------------');
                });

                await pageHtml.close();

                await page.click('[name="NewForm"]')

            }
            catch(err) {
                let document = docs[attributeName].documento;
                let message = 'CNPJ NÃO ESTÁ VÁLIDO PARA NEGOCIAÇÃO';
                let products = [];
                let event = {document, message, products};
                array.push(event);

                await page.click('[name="NewForm"]')
            }
        }

        res.send(array);
    }
    catch (err) {
        console.error('error', err.message);
    } finally {
        await browser.close();
    }
});