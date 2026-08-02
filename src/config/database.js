const mysql = require('mysql2/promise');
require('dotenv').config();

// 📌 Intentar obtener la URL de conexión desde variables de entorno
let mysqlUrl = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

// 🔧 Si la URL pública no tiene host (caso típico en Railway), agregarlo
if (mysqlUrl && mysqlUrl.startsWith('mysql://root:@:/')) {
    // Reemplazar con el host interno
    mysqlUrl = 'mysql://root:CIIJnWTbHPFTDgPvMwmACkKKdJsVGVpf@mysql.railway.internal:3306/railway';
    console.log('⚠️ URL pública sin host, usando host interno');
}

if (mysqlUrl) {
    console.log('✅ Conectando a MySQL mediante URL (Railway)');
    console.log(`🔗 URL: ${mysqlUrl.replace(/:[^:]*@/, ':****@')}`); // Ocultar contraseña
    const pool = mysql.createPool({ uri: mysqlUrl });
    
    async function testConnection() {
        try {
            const connection = await pool.getConnection();
            console.log('✅ Conectado a MySQL correctamente');
            connection.release();
            return true;
        } catch (error) {
            console.error('❌ Error conectando a MySQL:', error.message);
            return false;
        }
    }
    
    module.exports = { pool, testConnection };
} else {
    console.log('⚠️ No se encontró MYSQL_URL. Usando variables individuales (LOCAL)');
    const pool = mysql.createPool({
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
    
    async function testConnection() {
        try {
            const connection = await pool.getConnection();
            console.log('✅ Conectado a MySQL localmente');
            connection.release();
            return true;
        } catch (error) {
            console.error('❌ Error conectando a MySQL local:', error.message);
            return false;
        }
    }
    
    module.exports = { pool, testConnection };
}
