const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { eq } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { targets } = require('../db/schema');
const { normalizeTarget } = require('../utils/targetModel');

class DrizzleTargetRepository {
  constructor(options) {
    this.dbFilePath = options.dbFilePath;

    const dbDir = path.dirname(this.dbFilePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.sqlite = new Database(this.dbFilePath);
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS targets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        interval_ms INTEGER NOT NULL,
        paused INTEGER NOT NULL DEFAULT 0
      )
    `);

    this.db = drizzle(this.sqlite, { schema: { targets } });
  }

  toDomain(row) {
    return normalizeTarget({
      id: row.id,
      name: row.name,
      url: row.url,
      method: row.method,
      intervalMs: row.intervalMs,
      paused: Boolean(row.paused)
    });
  }

  toRow(input) {
    const normalized = normalizeTarget(input);
    return {
      id: normalized.id,
      name: normalized.name,
      url: normalized.url,
      method: normalized.method,
      intervalMs: normalized.intervalMs,
      paused: normalized.paused ? 1 : 0
    };
  }

  async seedIfEmpty(seedTargets) {
    const countRow = this.sqlite.prepare('SELECT COUNT(*) AS c FROM targets').get();
    if (Number(countRow.c || 0) > 0) {
      return;
    }

    const rows = (seedTargets || []).map((x) => this.toRow(x));
    if (rows.length === 0) {
      return;
    }

    this.db.insert(targets).values(rows).run();
  }

  async list() {
    const rows = this.db.select().from(targets).all();
    return rows.map((x) => this.toDomain(x));
  }

  async create(targetInput) {
    const row = this.toRow(targetInput);
    this.db.insert(targets).values(row).run();
    return this.toDomain(row);
  }

  async update(targetId, targetInput) {
    const existing = this.db.select().from(targets).where(eq(targets.id, targetId)).get();
    if (!existing) {
      return null;
    }

    const merged = this.toRow({
      ...this.toDomain(existing),
      ...targetInput,
      id: targetId
    });

    this.db
      .update(targets)
      .set({
        name: merged.name,
        url: merged.url,
        method: merged.method,
        intervalMs: merged.intervalMs,
        paused: merged.paused
      })
      .where(eq(targets.id, targetId))
      .run();

    return this.toDomain(merged);
  }

  async remove(targetId) {
    const result = this.db.delete(targets).where(eq(targets.id, targetId)).run();
    return Number(result.changes || 0) > 0;
  }
}

module.exports = {
  DrizzleTargetRepository
};
