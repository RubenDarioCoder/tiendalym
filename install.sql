-- ============================================
-- CREAR BASE DE DATOS
-- ============================================
CREATE DATABASE IF NOT EXISTS tienda_ropa;
USE tienda_ropa;

-- ============================================
-- TABLA: PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    images JSON,          -- Array de URLs de imágenes
    colors JSON,          -- Array de colores
    visible BOOLEAN DEFAULT TRUE,
    stock INT DEFAULT 0,
    sizes JSON,           -- Array de tallas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Índices para búsquedas rápidas
    INDEX idx_category (category),
    INDEX idx_visible (visible),
    INDEX idx_price (price),
    FULLTEXT INDEX idx_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- DATOS DE PRUEBA
-- ============================================
INSERT INTO productos (name, price, category, description, images, colors, visible, stock, sizes) VALUES
('Remera Oversize', 29.99, 'Remeras', 'Algodón 100% orgánico, corte holgado.', 
 '["https://picsum.photos/seed/remera1/400/400","https://picsum.photos/seed/remera2/400/400"]',
 '["Negro","Blanco"]', 1, 50, '["S","M","L","XL"]'),

('Pantalón Cargo', 49.50, 'Pantalones', 'Estilo urbano con múltiples bolsillos.',
 '["https://picsum.photos/seed/pantalon1/400/400"]',
 '["Verde Oliva","Gris"]', 1, 30, '["30","32","34","36"]'),

('Campera Rompevientos', 79.00, 'Camperas', 'Ligera, impermeable y con capucha.',
 '["https://picsum.photos/seed/campera1/400/400","https://picsum.photos/seed/campera2/400/400","https://picsum.photos/seed/campera3/400/400"]',
 '["Azul Marino","Negro"]', 1, 20, '["S","M","L"]'),

('Gorra Trucker', 19.99, 'Accesorios', 'Malla transpirable, ajuste click.',
 '["https://picsum.photos/seed/gorra1/400/400"]',
 '["Rojo","Negro"]', 1, 100, '["Única"]');

-- ============================================
-- VER DATOS INSERTADOS
-- ============================================
SELECT COUNT(*) AS total_productos FROM productos;
SELECT * FROM productos ORDER BY id LIMIT 5;