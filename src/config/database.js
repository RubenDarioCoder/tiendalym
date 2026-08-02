const mysql = require('mysql2/promise');
require('dotenv').config();

// Intentar usar MYSQL_URL de Railway, si existe
let poolConfig;
let connectionString = process.env.MYSQL_URL;

if (connectionString) {
    poolConfig = { uri: connectionString };
    console.log('🔗 Conectando a MySQL usando MYSQL_URL (Railway)');
} else {
    // Fallback a variables individuales (local)
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tienda_ropa',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    };
    console.log('🔗 Conectando a MySQL con variables individuales (Local)');
}

const pool = mysql.createPool(poolConfig);

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado a MySQL correctamente');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        console.error('Detalles:', error);
        return false;
    }
}

module.exports = { pool, testConnection };
