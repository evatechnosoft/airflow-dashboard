const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function appendJsonLine(filePath, payload) {
  ensureDir(path.dirname(filePath));
  const line = `${JSON.stringify(payload)}\n`;
  fs.appendFileSync(filePath, line, 'utf8');
}

function buildIoPaths(rootDir) {
  return {
    probeInputs: path.join(rootDir, 'inputs', 'probe-inputs.jsonl'),
    probeOutputs: path.join(rootDir, 'output', 'results', 'probe-outputs.jsonl'),
    targetEvents: path.join(rootDir, 'output', 'shared', 'target-events.jsonl')
  };
}

module.exports = {
  appendJsonLine,
  buildIoPaths
};
