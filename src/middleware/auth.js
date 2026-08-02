const jwt = require('jsonwebtoken');

function autenticarToken(req, res, next) {
    // Obtener el encabezado 'Authorization' (Formato: "Bearer TOKEN_AQUÍ")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token de autenticación.' });
    }

    try {
        // Verificar si el token es válido y no ha expirado
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_fallback');
        req.user = decoded; // Guardar datos del usuario decodificados en la petición
        next(); // Continuar a la ruta protegida
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado. Por favor, inicia sesión de nuevo.' });
    }
}

module.exports = autenticarToken;