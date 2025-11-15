// server/server.js
// Simple Express server storing counts in-memory (production: use a DB)
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 5000;
let counts = {}; // { countryName: count }
let recent = []; // [{country, ts}]

// endpoint to register a visit (POST)
app.post('/visit', (req, res) => {
    const country = req.body.country || 'Unknown';
    counts[country] = (counts[country] || 0) + 1;
    recent.unshift({ country, ts: Date.now() });
    if (recent.length > 100) recent.pop();
    res.json({ ok: true });
});

// endpoint to get top countries
app.get('/stats/top', (req, res) => {
    const arr = Object.keys(counts).map(k => ({ country: k, count: counts[k] }));
    arr.sort((a, b) => b.count - a.count);
    res.json({ top: arr.slice(0, 10) });
});

// endpoint to get recent
app.get('/stats/recent', (req, res) => {
    res.json({ recent });
});

app.listen(port, () => console.log(`Visitor server listening on ${port}`));
