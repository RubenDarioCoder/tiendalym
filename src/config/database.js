const mysql = require('mysql2/promise');
require('dotenv').config();

let poolConfig;

if (process.env.MYSQL_URL) {
    // Modo Railway: usar la URL completa
    console.log('🔗 Conectando a MySQL mediante MYSQL_URL (Railway)');
    poolConfig = {
        uri: process.env.MYSQL_URL,
        connectionLimit: 5,
        waitForConnections: true,
        queueLimit: 0,
        ssl: {
            rejectUnauthorized: false
        }
    };
} else {
    // Modo local: usar variables individuales
    console.log('🔗 Conectando a MySQL con variables individuales (Local)');
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tienda_ropa',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    };
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
        console.error('Detalles:', error.stack);
        return false;
    }
}

module.exports = { pool, testConnection };
