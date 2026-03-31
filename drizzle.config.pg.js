module.exports = {
  schema: './src/db/schema.pg.js',
  out: './output/shared/drizzle-pg',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/apiflow_monitor'
  }
};
