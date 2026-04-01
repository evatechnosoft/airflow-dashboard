const express = require('express');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { buildContainer } = require('./src/container');
const { normalizeTarget } = require('./src/utils/targetModel');
const { appendJsonLine, buildIoPaths } = require('./src/utils/ioLog');
const { ProbeScheduler } = require('./src/scheduler');

const app = express();
const HOST = String(process.env.HOST || '0.0.0.0');
const PORT = Number(process.env.PORT || 9201);
const PORT_CANDIDATES = String(process.env.PORT_CANDIDATES || `${PORT},9202,9203`)
  .split(',')
  .map((x) => Number(String(x).trim()))
  .filter((x) => Number.isFinite(x) && x > 0);

function resolvePublicHost() {
  if (process.env.PUBLIC_HOST) {
    return String(process.env.PUBLIC_HOST);
  }

  const ifaces = os.networkInterfaces();
  const candidates = [];

  for (const entries of Object.values(ifaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.internal || entry.family !== 'IPv4') {
        continue;
      }
      candidates.push(entry.address);
    }
  }

  const preferred = candidates.find((ip) => ip.startsWith('192.168.'))
    || candidates.find((ip) => ip.startsWith('10.'))
    || candidates.find((ip) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip));

  return preferred || '127.0.0.1';
}

const PUBLIC_HOST = resolvePublicHost();
const ROOT = __dirname;
const container = buildContainer({ rootDir: ROOT });
const ioPaths = buildIoPaths(ROOT);

app.use(express.json());

// Root endpoint dashboard.html'e yönlendir
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'dashboard.html'));
});

app.use(express.static(ROOT));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, at: new Date().toISOString() });
});

app.get('/api/targets', async (_req, res) => {
  try {
    const targets = await container.targetRepository.list();
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: 'targets okunamadi', detail: String(err.message || err) });
  }
});

app.post('/api/targets', async (req, res) => {
  try {
    const normalized = normalizeTarget(req.body || {});
    if (!normalized.name || !normalized.url) {
      return res.status(400).json({ error: 'name ve url gerekli' });
    }

    const created = await container.targetRepository.create(normalized);
    appendJsonLine(ioPaths.targetEvents, {
      at: new Date().toISOString(),
      event: 'target.created',
      payload: created
    });
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: 'target olusturulamadi', detail: String(err.message || err) });
  }
});

app.put('/api/targets/:id', async (req, res) => {
  try {
    const targetId = String(req.params.id || '').trim();
    if (!targetId) {
      return res.status(400).json({ error: 'id gerekli' });
    }

    const updated = await container.targetRepository.update(targetId, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'target bulunamadi' });
    }

    appendJsonLine(ioPaths.targetEvents, {
      at: new Date().toISOString(),
      event: 'target.updated',
      payload: updated
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'target guncellenemedi', detail: String(err.message || err) });
  }
});

app.delete('/api/targets/:id', async (req, res) => {
  try {
    const targetId = String(req.params.id || '').trim();
    if (!targetId) {
      return res.status(400).json({ error: 'id gerekli' });
    }

    const deleted = await container.targetRepository.remove(targetId);
    if (!deleted) {
      return res.status(404).json({ error: 'target bulunamadi' });
    }

    appendJsonLine(ioPaths.targetEvents, {
      at: new Date().toISOString(),
      event: 'target.deleted',
      payload: { id: targetId }
    });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'target silinemedi', detail: String(err.message || err) });
  }
});

app.post('/api/probe', async (req, res) => {
  const { url, method = 'GET', timeoutMs = 8000 } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url gerekli' });
  }

  try {
    appendJsonLine(ioPaths.probeInputs, {
      at: new Date().toISOString(),
      request: { url, method, timeoutMs }
    });

    const result = await container.probeService.probe({
      url,
      method,
      timeoutMs
    });

    appendJsonLine(ioPaths.probeOutputs, {
      at: new Date().toISOString(),
      request: { url, method, timeoutMs },
      response: result
    });

    return res.status(200).json(result);
  } catch (err) {
    const errorPayload = {
      ok: false,
      status: 0,
      latencyMs: 0,
      contentType: '',
      preview: '',
      json: null,
      checkedAt: new Date().toISOString(),
      attempts: 1,
      signal: 'DOWN',
      error: String(err.message || err)
    };

    appendJsonLine(ioPaths.probeOutputs, {
      at: new Date().toISOString(),
      request: { url, method, timeoutMs },
      response: errorPayload
    });

    res.status(200).json(errorPayload);
  }
});

app.post('/api/connector/export', async (req, res) => {
  try {
    const payload = req.body || {};
    const subscription = String(payload.subscription || 'local').trim() || 'local';
    const slug = subscription.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'local';
    const ts = new Date().toISOString().replace(/[.:]/g, '-');

    const baseDir = path.join(ROOT, 'output', 'shared');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const jsonFile = path.join(baseDir, `commit-ready-${slug}-${ts}.json`);
    const mdFile = path.join(baseDir, `commit-ready-${slug}-${ts}.md`);

    const cleaned = {
      generatedAt: new Date().toISOString(),
      subscription,
      connectorUrl: String(payload.connectorUrl || ''),
      connectorHealth: payload.connectorHealth || {},
      dryRunPlan: payload.dryRunPlan || null,
      targets: Array.isArray(payload.targets) ? payload.targets : []
    };

    fs.writeFileSync(jsonFile, `${JSON.stringify(cleaned, null, 2)}\n`, 'utf8');

    const md = [
      '# Commit Ready Export',
      '',
      `- generatedAt: ${cleaned.generatedAt}`,
      `- subscription: ${cleaned.subscription}`,
      `- connectorUrl: ${cleaned.connectorUrl || '-'}`,
      `- connectorStatus: ${cleaned.connectorHealth.status || 'idle'}`,
      `- connectorLastSyncAt: ${cleaned.connectorHealth.lastSyncAt || '-'}`,
      `- targets: ${cleaned.targets.length}`,
      '',
      '## Dry Run',
      cleaned.dryRunPlan
        ? `- add: ${cleaned.dryRunPlan.add} | update: ${cleaned.dryRunPlan.update} | delete: ${cleaned.dryRunPlan.delete}`
        : '- dry run plan yok',
      '',
      '## Suggested Commit',
      `chore(sync): commit-ready export for ${cleaned.subscription}`,
      ''
    ].join('\n');

    fs.writeFileSync(mdFile, md, 'utf8');

    appendJsonLine(ioPaths.targetEvents, {
      at: new Date().toISOString(),
      event: 'connector.exported',
      payload: {
        subscription: cleaned.subscription,
        files: [path.relative(ROOT, jsonFile), path.relative(ROOT, mdFile)]
      }
    });

    return res.status(200).json({
      ok: true,
      files: [path.relative(ROOT, jsonFile), path.relative(ROOT, mdFile)]
    });
  } catch (err) {
    return res.status(500).json({
      error: 'commit-ready export olusturulamadi',
      detail: String(err.message || err)
    });
  }
});

function logStartup(boundPort) {
  const mode = String(process.env.PROBE_MODE || 'mock').toLowerCase();
  const repository = String(process.env.TARGET_REPOSITORY || 'drizzle').toLowerCase();
  console.log(`APIFlow Monitor MVP running on http://127.0.0.1:${boundPort}`);
  console.log(`LAN access: http://${PUBLIC_HOST}:${boundPort}`);
  console.log(`Probe mode: ${mode} | Target repository: ${repository}`);
}

let scheduler = null;

function listenWithFallback(index = 0) {
  if (index >= PORT_CANDIDATES.length) {
    console.error(`No available port in candidates: ${PORT_CANDIDATES.join(', ')}`);
    process.exit(1);
  }

  const candidatePort = PORT_CANDIDATES[index];
  const server = app.listen(candidatePort, HOST);

  server.once('listening', async () => {
    if (index > 0) {
      console.warn(`Primary port busy, switched to fallback port ${candidatePort}`);
    }
    logStartup(candidatePort);

    // Start probe scheduler
    try {
      scheduler = new ProbeScheduler(container, ioPaths, { logInterval: 60000 });
      await scheduler.start();
      console.log('[Server] Probe scheduler started');
    } catch (err) {
      console.error('[Server] Error starting probe scheduler:', err);
      // Continue even if scheduler fails
    }
  });

  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${candidatePort} is in use, trying next candidate...`);
      listenWithFallback(index + 1);
      return;
    }

    console.error(`Server start error on port ${candidatePort}:`, err);
    process.exit(1);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  if (scheduler) {
    scheduler.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  if (scheduler) {
    scheduler.stop();
  }
  process.exit(0);
});

listenWithFallback();
