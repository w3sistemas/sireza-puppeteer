const puppeteerController = require('../controllers/puppeteerController');
module.exports = (app) => {
    app.post('/validate-lot', puppeteerController.validateLot);

    app.post('/validate-alone', puppeteerController.validateAlone);

    app.get('/page', puppeteerController.page);
}