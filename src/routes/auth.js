const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// POST /api/auth/login - Iniciar Sesión
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        }

        // 1. Buscar al usuario en la base de datos
        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const admin = rows[0];

        // 2. Comparar la contraseña ingresada con el Hash guardado en MySQL
        const match = await bcrypt.compare(password, admin.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 3. Actualizar la fecha del último login
        await pool.query('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);

        // 4. Generar el Token JWT (Válido por 2 horas)
        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET || 'clave_secreta_fallback',
            { expiresIn: '2h' }
        );

        // 5. Responder con el token y datos públicos del usuario
        res.json({
            message: 'Autenticación exitosa',
            token,
            user: {
                id: admin.id,
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('Error en /api/auth/login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/auth/validar-token - Validar token de acceso (URL)
router.get('/validar-token', (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).json({ error: 'Token no proporcionado' });
    }

    const secretToken = process.env.ACCESS_TOKEN;
    if (!secretToken) {
        console.error('ACCESS_TOKEN no definido en .env');
        return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (token === secretToken) {
        res.json({ valido: true });
    } else {
        res.status(401).json({ error: 'Token inválido', valido: false });
    }
});

module.exports = router;