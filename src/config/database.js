const mysql = require('mysql2/promise');
require('dotenv').config();

// Función para obtener la configuración de conexión
function getPoolConfig() {
    // 1. Prioridad: MYSQL_URL (Railway)
    if (process.env.MYSQL_URL) {
        console.log('🔗 Conectando a MySQL mediante MYSQL_URL (Railway)');
        return { uri: process.env.MYSQL_URL };
    }

    // 2. Prioridad: DATABASE_URL (alternativa en Railway)
    if (process.env.DATABASE_URL) {
        console.log('🔗 Conectando a MySQL mediante DATABASE_URL (Railway)');
        return { uri: process.env.DATABASE_URL };
    }

    // 3. Prioridad: Variables individuales (local)
    console.log('🔗 Conectando a MySQL con variables individuales (Local)');
    return {
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

const poolConfig = getPoolConfig();
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
