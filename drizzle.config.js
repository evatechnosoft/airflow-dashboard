module.exports = {
  schema: './src/db/schema.js',
  out: './output/shared/drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DRIZZLE_DB_FILE || './output/shared/apiflow.db'
  }
};
