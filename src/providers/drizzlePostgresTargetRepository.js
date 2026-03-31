const { eq } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { targetsPg } = require('../db/schema.pg');
const { normalizeTarget } = require('../utils/targetModel');

class DrizzlePostgresTargetRepository {
  constructor(options) {
    this.connectionString = options.connectionString;
    this.pool = new Pool({ connectionString: this.connectionString });
    this.db = drizzle(this.pool, { schema: { targetsPg } });
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

  async ensureSchema() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS targets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        interval_ms INTEGER NOT NULL,
        paused INTEGER NOT NULL DEFAULT 0
      )
    `);
  }

  async seedIfEmpty(seedTargets) {
    const countResult = await this.pool.query('SELECT COUNT(*)::int AS c FROM targets');
    const count = Number(countResult.rows?.[0]?.c || 0);
    if (count > 0) {
      return;
    }

    const rows = (seedTargets || []).map((x) => this.toRow(x));
    if (rows.length === 0) {
      return;
    }

    await this.db.insert(targetsPg).values(rows);
  }

  async list() {
    const rows = await this.db.select().from(targetsPg);
    return rows.map((x) => this.toDomain(x));
  }

  async create(targetInput) {
    const row = this.toRow(targetInput);
    await this.db.insert(targetsPg).values(row);
    return this.toDomain(row);
  }

  async update(targetId, targetInput) {
    const existing = await this.db.select().from(targetsPg).where(eq(targetsPg.id, targetId));
    if (!existing || existing.length === 0) {
      return null;
    }

    const merged = this.toRow({
      ...this.toDomain(existing[0]),
      ...targetInput,
      id: targetId
    });

    await this.db
      .update(targetsPg)
      .set({
        name: merged.name,
        url: merged.url,
        method: merged.method,
        intervalMs: merged.intervalMs,
        paused: merged.paused
      })
      .where(eq(targetsPg.id, targetId));

    return this.toDomain(merged);
  }

  async remove(targetId) {
    const result = await this.db.delete(targetsPg).where(eq(targetsPg.id, targetId)).returning({ id: targetsPg.id });
    return Array.isArray(result) && result.length > 0;
  }
}

module.exports = {
  DrizzlePostgresTargetRepository
};
