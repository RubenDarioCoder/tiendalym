const { pool } = require('../config/database');

// Función auxiliar para parsear JSON de forma segura y evitar crashes
function parseJSONSafely(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') return Object.values(value);
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
        // Si no es JSON válido (ej: string crudo o URL), lo convertimos a un array de 1 elemento
        return [String(value)];
    }
}

class Producto {
    // Obtener todos los productos con paginación, filtros y búsqueda
    static async findAll(filtros = {}) {
        const {
            page = 1,
            limit = 20,
            category = null,
            search = null,
            minPrice = null,
            maxPrice = null,
            visible = null,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = filtros;

        const offset = (page - 1) * limit;
        let condiciones = [];
        let valores = [];

        if (category) {
            condiciones.push('category = ?');
            valores.push(category);
        }

        if (search) {
            condiciones.push('(name LIKE ? OR description LIKE ?)');
            valores.push(`%${search}%`, `%${search}%`);
        }

        if (minPrice !== null) {
            condiciones.push('price >= ?');
            valores.push(minPrice);
        }

        if (maxPrice !== null) {
            condiciones.push('price <= ?');
            valores.push(maxPrice);
        }

        if (visible !== null) {
            condiciones.push('visible = ?');
            valores.push(visible ? 1 : 0);
        }

        const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
        const sortFields = ['id', 'name', 'price', 'category', 'created_at', 'updated_at'];
        const orderField = sortFields.includes(sortBy) ? sortBy : 'created_at';
        const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const countQuery = `SELECT COUNT(*) as total FROM productos ${whereClause}`;
        const [countResult] = await pool.query(countQuery, valores);
        const total = countResult[0].total;

        const query = `
            SELECT * FROM productos 
            ${whereClause}
            ORDER BY ${orderField} ${orderDir}
            LIMIT ? OFFSET ?
        `;

        const [rows] = await pool.query(query, [...valores, limit, offset]);

        // Mapeo seguro con parseJSONSafely
        const productos = rows.map(row => ({
            ...row,
            images: parseJSONSafely(row.images),
            colors: parseJSONSafely(row.colors),
            sizes: parseJSONSafely(row.sizes),
            visible: row.visible === 1
        }));

        return {
            productos,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            limit
        };
    }

    // Obtener un producto por ID
    static async findById(id) {
        const query = 'SELECT * FROM productos WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        if (rows.length === 0) return null;

        const row = rows[0];
        return {
            ...row,
            images: parseJSONSafely(row.images),
            colors: parseJSONSafely(row.colors),
            sizes: parseJSONSafely(row.sizes),
            visible: row.visible === 1
        };
    }

    // Crear un nuevo producto
    static async create(producto) {
        const { name, price, category, description, images, colors, visible, stock, sizes } = producto;
        
        console.log('📌 Guardando nuevo producto:', producto); // Log de depuración

        const query = `
            INSERT INTO productos 
            (name, price, category, description, images, colors, visible, stock, sizes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(query, [
            name,
            price,
            category,
            description || '',
            JSON.stringify(images || []),
            JSON.stringify(colors || []),
            visible !== false ? 1 : 0,
            stock || 0,
            JSON.stringify(sizes || [])
        ]);
        return this.findById(result.insertId);
    }

    // Actualizar un producto
    static async update(id, producto) {
        const { name, price, category, description, images, colors, visible, stock, sizes } = producto;
        const existing = await this.findById(id);
        if (!existing) return null;

        const query = `
            UPDATE productos SET 
                name = ?, 
                price = ?, 
                category = ?, 
                description = ?, 
                images = ?, 
                colors = ?, 
                visible = ?, 
                stock = ?, 
                sizes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        await pool.query(query, [
            name || existing.name,
            price || existing.price,
            category || existing.category,
            description || existing.description,
            JSON.stringify(images || existing.images),
            JSON.stringify(colors || existing.colors),
            visible !== undefined ? (visible ? 1 : 0) : existing.visible ? 1 : 0,
            stock !== undefined ? stock : existing.stock,
            JSON.stringify(sizes || existing.sizes),
            id
        ]);
        return this.findById(id);
    }

    // Eliminar un producto
    static async delete(id) {
        const query = 'DELETE FROM productos WHERE id = ?';
        const [result] = await pool.query(query, [id]);
        return result.affectedRows > 0;
    }

    // Obtener categorías únicas
    static async getCategorias() {
        const query = 'SELECT DISTINCT category FROM productos ORDER BY category';
        const [rows] = await pool.query(query);
        return rows.map(row => row.category);
    }

    // Obtener colores únicos de forma segura
    static async getColores() {
        const query = 'SELECT DISTINCT colors FROM productos';
        const [rows] = await pool.query(query);
        const coloresSet = new Set();
        rows.forEach(row => {
            if (row.colors) {
                const arr = parseJSONSafely(row.colors);
                arr.forEach(c => {
                    if (typeof c === 'string' && c.trim()) {
                        coloresSet.add(c.trim());
                    }
                });
            }
        });
        return Array.from(coloresSet).sort();
    }

    // Estadísticas
    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(visible = 1) as visibles,
                SUM(visible = 0) as ocultos,
                AVG(price) as precio_promedio,
                SUM(stock) as stock_total
            FROM productos
        `;
        const [rows] = await pool.query(query);
        return rows[0];
    }
}

module.exports = Producto;