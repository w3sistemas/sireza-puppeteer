const puppeteerController = require('../controllers/puppeteerController');
module.exports = (app) => {
    app.post('/', puppeteerController.post);

    app.get('/result', puppeteerController.get);
}