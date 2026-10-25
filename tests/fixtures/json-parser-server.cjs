const express = require('express');
const { jsonBody, jsonBodyErrorHandler } = require('../../server/middleware/jsonBody');
const app = express();
app.use(process.argv[2] === 'default' ? express.json() : jsonBody());
app.post('/json', (req, res) => res.json({ ok: true }));
app.get('/health', (req, res) => res.json({ ok: true }));
app.use(jsonBodyErrorHandler);
const server = app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
