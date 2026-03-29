const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 8095);
const ROOT = __dirname;

app.use(express.json());
app.use(express.static(ROOT));

function classifySignal(status, errorText) {
  if (errorText && String(errorText).toLowerCase().includes('timeout')) {
    return 'TIMEOUT';
  }
  if (status >= 200 && status < 400) {
    return 'UP';
  }
  if (status >= 400 && status < 500) {
    return 'WARN';
  }
  if (status >= 500 || status === 0) {
    return 'DOWN';
  }
  return 'DOWN';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get('/api/targets', (_req, res) => {
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'targets.json'), 'utf8');
    const targets = JSON.parse(raw);
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: 'targets okunamadi', detail: String(err.message || err) });
  }
});

app.post('/api/probe', async (req, res) => {
  const { url, method = 'GET', timeoutMs = 8000 } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url gerekli' });
  }

  const startedAt = Date.now();
  const maxAttempts = 2;
  const retryDelayMs = 500;
  let lastPayload = null;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          signal: controller.signal,
          headers: {
            'user-agent': 'apiflow-monitor-mvp/0.1'
          }
        });

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        let parsed = null;
        if (contentType.includes('application/json')) {
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
        }

        const payload = {
          ok: response.ok,
          status: response.status,
          latencyMs: Date.now() - startedAt,
          contentType,
          preview: text.slice(0, 2000),
          json: parsed,
          checkedAt: new Date().toISOString(),
          attempts: attempt,
          signal: classifySignal(response.status, '')
        };

        lastPayload = payload;
        clearTimeout(timer);

        if (response.ok || response.status < 500 || attempt === maxAttempts) {
          return res.json(payload);
        }

        await sleep(retryDelayMs * attempt);
      } catch (err) {
        const isTimeout = err && err.name === 'AbortError';
        const message = isTimeout ? `timeout after ${timeoutMs}ms` : String(err.message || err);
        const payload = {
          ok: false,
          status: 0,
          latencyMs: Date.now() - startedAt,
          contentType: '',
          preview: '',
          json: null,
          checkedAt: new Date().toISOString(),
          attempts: attempt,
          signal: classifySignal(0, message),
          error: message
        };

        lastPayload = payload;
        clearTimeout(timer);

        if (attempt < maxAttempts) {
          await sleep(retryDelayMs * attempt);
          continue;
        }

        return res.status(200).json(payload);
      }
    }

    return res.status(200).json(lastPayload || {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      contentType: '',
      preview: '',
      json: null,
      checkedAt: new Date().toISOString(),
      attempts: maxAttempts,
      signal: 'DOWN',
      error: 'unknown probe failure'
    });
  } catch (err) {
    res.status(200).json({
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      contentType: '',
      preview: '',
      json: null,
      checkedAt: new Date().toISOString(),
      attempts: maxAttempts,
      signal: classifySignal(0, String(err.message || err)),
      error: String(err.message || err)
    });
  }
});

app.listen(PORT, () => {
  console.log(`APIFlow Monitor MVP running on http://127.0.0.1:${PORT}`);
});
