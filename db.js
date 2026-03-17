const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Pri@2004", 
    database: "vms"
});

connection.connect((err) => {
    if (err) {
        console.error("DB connection failed:", err);
        return;
    }
    console.log("Connected to MySQL");
});

module.exports = connection;