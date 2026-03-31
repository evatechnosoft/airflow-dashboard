function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTarget(input) {
  return {
    id: input.id || generateId(),
    name: String(input.name || '').trim(),
    url: String(input.url || '').trim(),
    method: String(input.method || 'GET').toUpperCase(),
    intervalMs: Math.max(3000, Number(input.intervalMs || 10000)),
    paused: Boolean(input.paused)
  };
}

module.exports = {
  normalizeTarget
};
