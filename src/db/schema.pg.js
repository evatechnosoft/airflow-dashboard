const { pgTable, text, integer } = require('drizzle-orm/pg-core');

const targetsPg = pgTable('targets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  method: text('method').notNull(),
  intervalMs: integer('interval_ms').notNull(),
  paused: integer('paused').notNull().default(0)
});

module.exports = {
  targetsPg
};
