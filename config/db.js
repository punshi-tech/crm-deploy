const mysql = require("mysql2/promise");

// New DB Connection (Multiple Connections)
async function connectDB() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 11311, // Aiven uses non-standard ports (e.g., 11311) instead of 3306
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
      rejectUnauthorized: false // Forces SSL connection required by Aiven without needing to host a physical CA cert file on Render
    }
  });

  console.log("✅ MySQL Pool Connected!");
  return pool;
}

module.exports = connectDB;








//          --- Old DB Configurations (Before using Aiven)
// const mysql = require("mysql2/promise");

// // New DB Connection (Multipule Connections)
// async function connectDB() {
//   const pool = mysql.createPool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASS,
//     database: process.env.DB_NAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
//   });

//   console.log("✅ MySQL Pool Connected!");
//   return pool;
// }
// module.exports = connectDB;
