const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración para Railway (usa MYSQL_URL) o local
let poolConfig;

// Si existe MYSQL_URL (Railway la inyecta), usarla
if (process.env.MYSQL_URL) {
    console.log('🔗 Conectando a MySQL mediante MYSQL_URL (Railway)');
    poolConfig = { uri: process.env.MYSQL_URL };
} else {
    // Modo local
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
        if (error.code) console.error('Código de error:', error.code);
        if (error.syscall) console.error('Syscall:', error.syscall);
        if (error.address) console.error('Dirección:', error.address);
        if (error.port) console.error('Puerto:', error.port);
        console.error('Detalles completos:', error);
        return false;
    }
}

module.exports = { pool, testConnection };
