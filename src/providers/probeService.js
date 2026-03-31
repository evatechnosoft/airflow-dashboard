const { classifySignal, sleep } = require('../utils/signal');

class ProbeService {
  async probe(_requestPayload) {
    throw new Error('Not implemented: probe');
  }
}

class LiveProbeService extends ProbeService {
  constructor(options) {
    super();
    this.maxAttempts = options.maxAttempts || 2;
    this.retryDelayMs = options.retryDelayMs || 500;
  }

  async probe(input) {
    const { url, method = 'GET', timeoutMs = 8000 } = input;
    const startedAt = Date.now();
    let lastPayload = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          signal: controller.signal,
          headers: {
            'user-agent': 'apiflow-monitor-mvp/0.2'
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

        if (response.ok || response.status < 500 || attempt === this.maxAttempts) {
          return payload;
        }

        await sleep(this.retryDelayMs * attempt);
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

        if (attempt < this.maxAttempts) {
          await sleep(this.retryDelayMs * attempt);
          continue;
        }

        return payload;
      }
    }

    return lastPayload || {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      contentType: '',
      preview: '',
      json: null,
      checkedAt: new Date().toISOString(),
      attempts: this.maxAttempts,
      signal: 'DOWN',
      error: 'unknown probe failure'
    };
  }
}

function hashString(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

class MockProbeService extends ProbeService {
  async probe(input) {
    const { url, method = 'GET' } = input;
    const key = `${method}|${url}`;
    const nowTick = Math.floor(Date.now() / 5000);
    const base = hashString(key);
    const drift = (base + nowTick) % 100;
    const latencyMs = 80 + (base % 180) + drift * 4;

    let status = 200;
    if (drift > 92) {
      status = 503;
    } else if (drift > 82) {
      status = 429;
    }

    const ok = status >= 200 && status < 400;
    const signal = classifySignal(status, '');

    return {
      ok,
      status,
      latencyMs,
      contentType: 'application/json',
      preview: JSON.stringify({
        source: 'mock',
        syntheticLoad: drift,
        mode: ok ? 'stable' : 'pressure'
      }),
      json: {
        source: 'mock',
        syntheticLoad: drift,
        mode: ok ? 'stable' : 'pressure'
      },
      checkedAt: new Date().toISOString(),
      attempts: 1,
      signal
    };
  }
}

function createProbeService(config) {
  const mode = String(config.mode || 'mock').toLowerCase();

  if (mode === 'live') {
    return new LiveProbeService({
      maxAttempts: Number(config.maxAttempts || 2),
      retryDelayMs: Number(config.retryDelayMs || 500)
    });
  }

  if (mode === 'mock') {
    return new MockProbeService();
  }

  throw new Error(`Unsupported PROBE_MODE: ${mode}`);
}

module.exports = {
  createProbeService
};
