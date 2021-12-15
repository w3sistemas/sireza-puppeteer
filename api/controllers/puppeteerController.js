const config = require("config");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

exports.get = (req, res, next) => {
    res.sendFile(path.join(__dirname + '/destination.html'));
}

exports.post = async (req, res, next) => {

    const browser = await puppeteer.launch({args: ['--no-sandbox']});

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
        await page.waitForSelector(config.get('selectors.table'), {timeout: 10000});

        console.log('salvando html')
        let bodyHTML = await page.evaluate(() => document.querySelector('*').innerHTML);

        fs.writeFile(path.join(__dirname + '/destination.html'), bodyHTML, function (err) {
            if (err) {
                console.log(err);
            }
        });

        console.log('acessando html')
        await page.goto(`http://localhost:` + config.get('server.port') + `/result`);

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
};