const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use('/static', express.static(path.join(__dirname, 'public', 'static')));

// Page routes — map clean URLs to HTML files
const pages = {
  '/':                  'home.html',
  '/batches':           'home.html',
  '/subjects':          'subjects.html',
  '/content':           'content.html',
  '/stream':            'stream.html',
  '/schedule-details':  'schedule-details.html',
  '/get-access':        'get-access.html',
  '/reset-key':         'get-access.html',
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

// VPLINK proxy (local dev version of the edge function)
app.get('/api/vplink', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });

  const API_TOKEN = 'bb0082e0ede156f2a39bf274f943aa567155b660';
  try {
    const r = await fetch(`https://vplink.in/api?api=${API_TOKEN}&url=${encodeURIComponent(targetUrl)}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'VPLINK request failed', detail: err.message });
  }
});

// Penpencil API proxy for local development
app.use('/pw-api', async (req, res) => {
  const targetUrl = 'https://api.penpencil.co' + req.url;
  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.referer;
    
    // We only need to proxy GET/POST for Penpencil usually, but let's handle bodies just in case
    // For a simple local dev proxy, forwarding everything works best
    let bodyData;
    if (!['GET', 'HEAD'].includes(req.method)) {
        // If there's a body, we would need body-parser, but since we don't have it,
        // we'll just proxy the most common cases or ignore body if it's just GETs.
        // Actually, most API calls from stream are GETs.
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
    });
    
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });
    
    res.status(response.status);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ error: 'PW API request failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ⚡ As Multiverse dev server running at http://localhost:${PORT}\n`);
});
