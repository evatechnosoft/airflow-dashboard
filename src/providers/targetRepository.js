const fs = require('fs');
const path = require('path');
const { DrizzleTargetRepository } = require('./drizzleTargetRepository');
const { DrizzlePostgresTargetRepository } = require('./drizzlePostgresTargetRepository');
const { normalizeTarget } = require('../utils/targetModel');

class TargetRepository {
  async list() {
    throw new Error('Not implemented: list');
  }

  async create(targetInput) {
    throw new Error('Not implemented: create');
  }

  async update(targetId, targetInput) {
    throw new Error('Not implemented: update');
  }

  async remove(targetId) {
    throw new Error('Not implemented: remove');
  }
}

class FileTargetRepository extends TargetRepository {
  constructor(options) {
    super();
    this.filePath = options.filePath;
  }

  readRaw() {
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeTarget);
  }

  writeRaw(items) {
    fs.writeFileSync(this.filePath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  }

  async list() {
    return this.readRaw();
  }

  async create(targetInput) {
    const all = this.readRaw();
    const next = normalizeTarget(targetInput);
    all.push(next);
    this.writeRaw(all);
    return next;
  }

  async update(targetId, targetInput) {
    const all = this.readRaw();
    const idx = all.findIndex((x) => x.id === targetId);
    if (idx < 0) {
      return null;
    }

    const merged = {
      ...all[idx],
      ...targetInput,
      id: targetId
    };

    all[idx] = normalizeTarget(merged);
    this.writeRaw(all);
    return all[idx];
  }

  async remove(targetId) {
    const all = this.readRaw();
    const before = all.length;
    const filtered = all.filter((x) => x.id !== targetId);
    if (filtered.length === before) {
      return false;
    }
    this.writeRaw(filtered);
    return true;
  }
}

class MockTargetRepository extends TargetRepository {
  constructor(options) {
    super();
    const seed = options.seedTargets || [];
    this.items = seed.map(normalizeTarget);
  }

  async list() {
    return this.items;
  }

  async create(targetInput) {
    const next = normalizeTarget(targetInput);
    this.items.push(next);
    return next;
  }

  async update(targetId, targetInput) {
    const idx = this.items.findIndex((x) => x.id === targetId);
    if (idx < 0) {
      return null;
    }
    const merged = {
      ...this.items[idx],
      ...targetInput,
      id: targetId
    };
    this.items[idx] = normalizeTarget(merged);
    return this.items[idx];
  }

  async remove(targetId) {
    const before = this.items.length;
    this.items = this.items.filter((x) => x.id !== targetId);
    return this.items.length < before;
  }
}

function readSeedTargets(rootDir) {
  const targetFile = path.join(rootDir, 'targets.json');
  const raw = fs.readFileSync(targetFile, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map(normalizeTarget);
}

function createTargetRepository(config) {
  const rootDir = config.rootDir;
  const provider = String(config.provider || 'mock').toLowerCase();

  if (provider === 'file') {
    return new FileTargetRepository({
      filePath: path.join(rootDir, 'targets.json')
    });
  }

  if (provider === 'mock') {
    return new MockTargetRepository({
      seedTargets: readSeedTargets(rootDir)
    });
  }

  if (provider === 'drizzle') {
    const repository = new DrizzleTargetRepository({
      dbFilePath: process.env.DRIZZLE_DB_FILE || path.join(rootDir, 'output', 'shared', 'apiflow.db')
    });

    repository.seedIfEmpty(readSeedTargets(rootDir));
    return repository;
  }

  if (provider === 'drizzle-pg' || provider === 'postgres') {
    const repository = new DrizzlePostgresTargetRepository({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/apiflow_monitor'
    });

    repository.ensureSchema();
    repository.seedIfEmpty(readSeedTargets(rootDir));
    return repository;
  }

  throw new Error(`Unsupported TARGET_REPOSITORY: ${provider}`);
}

module.exports = {
  createTargetRepository,
  normalizeTarget
};
