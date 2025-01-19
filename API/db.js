const { Pool } = require("pg"); // Import pg module

// Set up connection pool for Supabase PostgreSQL
const pool = new Pool({
  user: "postgres.akdlmvaxtbcbzunlxirr", 
  password: "diXuPkZgNMoe6Ruq", 
  host: "aws-0-us-east-1.pooler.supabase.com", 
  database: "postgres", 
  port: 6543, 
  ssl: {
    rejectUnauthorized: false, 
  },
});

module.exports = pool;


