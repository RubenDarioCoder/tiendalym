const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');
const autenticarToken = require('../middleware/auth'); // Importamos el middleware

// ============================================
// RUTAS PÚBLICAS (Cualquier visitante las puede ver)
// ============================================

// GET /api/productos - Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const {
            page, limit, category, search,
            minPrice, maxPrice, visible,
            sortBy, sortOrder
        } = req.query;

        const resultado = await Producto.findAll({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            category: category || null,
            search: search || null,
            minPrice: minPrice ? parseFloat(minPrice) : null,
            maxPrice: maxPrice ? parseFloat(maxPrice) : null,
            visible: visible !== undefined ? (visible === 'true') : null,
            sortBy: sortBy || 'created_at',
            sortOrder: sortOrder || 'DESC'
        });
        res.json(resultado);
    } catch (error) {
        console.error('Error en GET /api/productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// GET /api/productos/categorias - Obtener categorías únicas
router.get('/categorias', async (req, res) => {
    try {
        const categorias = await Producto.getCategorias();
        res.json(categorias);
    } catch (error) {
        console.error('Error en GET /api/productos/categorias:', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// GET /api/productos/colores - Obtener colores únicos
router.get('/colores', async (req, res) => {
    try {
        const colores = await Producto.getColores();
        res.json(colores);
    } catch (error) {
        console.error('Error en GET /api/productos/colores:', error);
        res.status(500).json({ error: 'Error al obtener colores' });
    }
});

// GET /api/productos/stats - Obtener estadísticas
router.get('/stats', async (req, res) => {
    try {
        const stats = await Producto.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error en GET /api/productos/stats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// GET /api/productos/:id - Obtener un producto por ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const producto = await Producto.findById(id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        console.error('Error en GET /api/productos/:id:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// ============================================
// RUTAS PROTEGIDAS (Solo accesibles con Token JWT válido)
// ============================================

// POST /api/productos - Crear un producto
router.post('/', autenticarToken, async (req, res) => {
    try {
        const { name, price, category, description, images, colors, visible, stock, sizes } = req.body;

        if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
        if (!price || isNaN(price)) return res.status(400).json({ error: 'El precio es obligatorio y debe ser un número' });
        if (!category) return res.status(400).json({ error: 'La categoría es obligatoria' });

        const producto = await Producto.create({
            name,
            price: parseFloat(price),
            category,
            description: description || '',
            images: images || [],
            colors: colors || [],
            visible: visible !== false,
            stock: parseInt(stock) || 0,
            sizes: sizes || []
        });
        res.status(201).json(producto);
    } catch (error) {
        console.error('Error en POST /api/productos:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// PUT /api/productos/:id - Actualizar un producto
router.put('/:id', autenticarToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const producto = await Producto.update(id, req.body);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        console.error('Error en PUT /api/productos/:id:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE /api/productos/:id - Eliminar un producto
router.delete('/:id', autenticarToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const eliminado = await Producto.delete(id);
        if (!eliminado) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Error en DELETE /api/productos/:id:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;