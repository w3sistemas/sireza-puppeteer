const puppeteerController = require('../controllers/puppeteerController');
module.exports = (app) => {
    app.post('/validate-lot', puppeteerController.validateLot);

    app.get('/validate-alone', puppeteerController.validateAlone);

    app.get('/page', puppeteerController.page);
}