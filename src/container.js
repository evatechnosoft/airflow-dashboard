const { createTargetRepository } = require('./providers/targetRepository');
const { createProbeService } = require('./providers/probeService');

function buildContainer(config) {
  const rootDir = config.rootDir;

  const targetRepository = createTargetRepository({
    rootDir,
    provider: process.env.TARGET_REPOSITORY || 'drizzle'
  });

  const probeService = createProbeService({
    mode: process.env.PROBE_MODE || 'mock',
    maxAttempts: process.env.PROBE_MAX_ATTEMPTS || 2,
    retryDelayMs: process.env.PROBE_RETRY_DELAY_MS || 500
  });

  return {
    targetRepository,
    probeService
  };
}

module.exports = {
  buildContainer
};
