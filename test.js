const { pool } = require('./src/config/database');
const Producto = require('./src/models/Producto');

(async () => {
    try {
        console.log('🔄 Probando conexión a MySQL...');
        const connection = await pool.getConnection();
        console.log('✅ Conectado');
        connection.release();

        console.log('🔄 Probando consulta a productos...');
        const result = await Producto.findAll({ limit: 2 });
        console.log('✅ Productos:', result);
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        process.exit();
    }
})();