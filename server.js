require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./src/config/database');
const productosRoutes = require('./src/routes/productos');
const authRoutes = require('./src/routes/auth');
const autenticarToken = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARES
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// RUTAS
app.use('/api/auth', authRoutes); // Endpoint para Login
app.use('/api/productos', productosRoutes); // Endpoint de Productos

// INICIAR SERVIDOR
async function startServer() {
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ No se pudo conectar a la base de datos.');
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
}
startServer();