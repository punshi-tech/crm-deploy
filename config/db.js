const mysql = require("mysql2/promise");

// New DB Connection (Multipule Connections)
async function connectDB() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log("✅ MySQL Pool Connected!");
  return pool;
}
module.exports = connectDB;
