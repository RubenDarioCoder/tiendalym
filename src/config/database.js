const mysql = require('mysql2/promise');
require('dotenv').config();

// 🔍 Imprimir TODAS las variables de entorno (para depurar)
console.log('=== VARIABLES DE ENTORNO (solo las que empiezan con MYSQL) ===');
Object.keys(process.env).forEach(key => {
    if (key.startsWith('MYSQL')) {
        console.log(`${key}=${process.env[key]}`);
    }
});
console.log('===================================================');

// 👇 Usar MYSQL_URL si existe, si no, fallback a localhost
let pool;
if (process.env.MYSQL_URL) {
    console.log('✅ Usando MYSQL_URL para conectar');
    pool = mysql.createPool({ uri: process.env.MYSQL_URL });
} else {
    console.log('⚠️ MYSQL_URL NO ENCONTRADO. Usando variables individuales (LOCAL)');
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tienda_ropa',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    });
}

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
