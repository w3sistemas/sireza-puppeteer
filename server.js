const app = require('./config/express')();
const port = app.get('port');

require('./api/routes/index')(app); // <--- basta adicionar essa linha

// RODANDO NOSSA APLICAÇÃO NA PORTA SETADA
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`)
});