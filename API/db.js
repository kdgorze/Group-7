const mysql = require("mysql2");

// Create MySQL connection pool
const pool = mysql.createPool({
  host: "localhost", // Replace with your host
  user: "root", // Replace with your username
  password: "", // Replace with your password
  database: "picklers", // Replace with your database name
});

// Export the connection pool
module.exports = pool.promise();



// probably a good idea to add a .env file to store the database credentials