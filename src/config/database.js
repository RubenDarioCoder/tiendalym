const mysql = require('mysql2/promise');
require('dotenv').config();

// 🌐 PRIORIDAD: Si existe MYSQL_URL (Railway), la usa
// 🔧 Si no, usa variables individuales (local)
let poolConfig;

if (process.env.MYSQL_URL) {
    // Usar la URL completa de Railway
    poolConfig = { uri: process.env.MYSQL_URL };
    console.log('🔗 Conectando a MySQL mediante MYSQL_URL (Railway)');
} else {
    // Fallback a variables individuales (para desarrollo local)
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
        if (error.code) console.error('Detalles:', error.code);
        return false;
    }
}

module.exports = { pool, testConnection };
