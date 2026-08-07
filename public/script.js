// ============================================
// CONFIGURACIÓN
// ============================================
const API_URL = '/api/productos';
const AUTH_URL = '/api/auth';
const WHATSAPP_NUMBER = '5491144701604';

// ============================================
// ESTADO GLOBAL
// ============================================
let productos = [];
let sesionActiva = false;
let jwtToken = null;
let tokenUrlValido = false;
let editandoIndex = -1;
let filtroCategoria = 'all';
let filtroColor = null; // Nuevo: filtro por color
let paginaActual = 1;
let totalPaginas = 1;
let currentImages = [];
let carrito = [];
let productoEnAgregar = null;

// ============================================
// REFERENCIAS DOM
// ============================================
const catalogContainer = document.getElementById('catalogContainer');
const filterContainer = document.getElementById('filterContainer');
const loginModal = document.getElementById('loginModal');
const adminModal = document.getElementById('adminModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const productForm = document.getElementById('productForm');
const adminProductList = document.getElementById('adminProductList');
const editIndexInput = document.getElementById('editIndex');
const adminButtonContainer = document.getElementById('adminButtonContainer');

const loginClose = document.getElementById('loginClose');
const adminClose = document.getElementById('adminClose');
const logoutBtn = document.getElementById('logoutBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const resetDataBtn = document.getElementById('resetDataBtn');

const prodName = document.getElementById('prodName');
const prodPrice = document.getElementById('prodPrice');
const prodCategory = document.getElementById('prodCategory');
const prodDesc = document.getElementById('prodDesc');
const prodColors = document.getElementById('prodColors');
const prodImageUrls = document.getElementById('prodImageUrls');
const prodImageFiles = document.getElementById('prodImageFiles');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const prodVisible = document.getElementById('prodVisible');
const categoryList = document.getElementById('categoryList');
const colorList = document.getElementById('colorList');

// Carrito
const cartToggle = document.getElementById('cartToggle');
const cartClose = document.getElementById('cartClose');
const cartOverlay = document.getElementById('cartOverlay');
const cartSidebar = document.getElementById('cartSidebar');
const cartItems = document.getElementById('cartItems');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const cartCount = document.getElementById('cartCount');
const cartWhatsApp = document.getElementById('cartWhatsApp');

// Modal de especificaciones
const especModal = document.getElementById('especModal');
const especProductName = document.getElementById('especProductName');
const especProductPrice = document.getElementById('especProductPrice');
const especInput = document.getElementById('especInput');
const especConfirm = document.getElementById('especConfirm');
const especCancel = document.getElementById('especCancel');

// Modal de imagen
const imageModal = document.getElementById('imageModal');
const imageModalImg = document.getElementById('imageModalImg');
const imageModalClose = document.getElementById('imageModalClose');

// ============================================
// FUNCIONES DE UTILIDAD (SCROLL)
// ============================================
function bloquearScroll() {
    document.body.style.overflow = 'hidden';
}

function desbloquearScroll() {
    const modalesActivos = document.querySelectorAll('.modal-overlay.active, #cartOverlay.active, #imageModal.active');
    if (modalesActivos.length === 0) {
        document.body.style.overflow = '';
    }
}

// ============================================
// FUNCIÓN AUXILIAR: Formatear precio
// ============================================
function formatearPrecio(precio) {
    const num = typeof precio === 'number' ? precio : parseFloat(precio) || 0;
    return num.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ============================================
// MODAL DE IMAGEN
// ============================================
function abrirModalImagen(src) {
    if (!imageModal || !imageModalImg) return;
    imageModalImg.src = src;
    imageModal.classList.add('active');
    bloquearScroll();
    // Forzar reflow para animación
    void imageModal.offsetWidth;
    imageModalImg.style.transform = 'scale(1)';
    imageModalImg.style.opacity = '1';
}

function cerrarModalImagen() {
    if (!imageModal) return;
    imageModalImg.style.transform = 'scale(0.8)';
    imageModalImg.style.opacity = '0';
    setTimeout(() => {
        imageModal.classList.remove('active');
        imageModalImg.src = '';
        desbloquearScroll();
    }, 200);
}

// Cerrar con ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (imageModal && imageModal.classList.contains('active')) {
            cerrarModalImagen();
        }
    }
});

// ============================================
// MODAL DE ESPECIFICACIONES
// ============================================
function abrirModalEspecificaciones(producto) {
    productoEnAgregar = producto;
    const price = typeof producto.price === 'number' ? producto.price : parseFloat(producto.price) || 0;
    especProductName.textContent = producto.name;
    especProductPrice.textContent = `$${formatearPrecio(price)}`;
    especInput.value = '';
    especModal.classList.add('active');
    especInput.focus();
}

function cerrarModalEspecificaciones() {
    especModal.classList.remove('active');
    productoEnAgregar = null;
    especInput.value = '';
    desbloquearScroll();
}

function confirmarAgregarAlCarrito() {
    if (!productoEnAgregar) return;
    const especificacion = especInput.value.trim();
    agregarAlCarritoConEspec(productoEnAgregar.id, especificacion);
    cerrarModalEspecificaciones();
}

// ============================================
// CARRITO
// ============================================
function cargarCarrito() {
    const stored = localStorage.getItem('carrito');
    if (stored) {
        try {
            carrito = JSON.parse(stored);
            carrito = carrito.map(item => ({
                ...item,
                price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                especificacion: item.especificacion || ''
            }));
        } catch (e) {
            carrito = [];
        }
    } else {
        carrito = [];
    }
    actualizarContadorCarrito();
}

function guardarCarrito() {
    carrito = carrito.map(item => ({
        ...item,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
        especificacion: item.especificacion || ''
    }));
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
    const total = carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    if (cartCount) cartCount.textContent = total;
}

function agregarAlCarritoConEspec(productoId, especificacion) {
    const prod = productos.find(p => p.id == productoId);
    if (!prod) return;
    const price = typeof prod.price === 'number' ? prod.price : parseFloat(prod.price) || 0;

    const existe = carrito.find(item => item.id == productoId && item.especificacion === especificacion);
    if (existe) {
        existe.cantidad = (existe.cantidad || 0) + 1;
    } else {
        carrito.push({
            id: prod.id,
            name: prod.name,
            price: price,
            cantidad: 1,
            image: (prod.images && prod.images.length > 0) ? prod.images[0] : '',
            especificacion: especificacion || ''
        });
    }
    guardarCarrito();
    renderizarCarrito();

    const btn = document.querySelector(`.btn-add-cart[data-id="${productoId}"]`);
    if (btn) {
        btn.textContent = '✓ Agregado';
        btn.classList.add('added');
        setTimeout(() => {
            btn.textContent = '🛒 Agregar al carrito';
            btn.classList.remove('added');
        }, 2000);
    }

    abrirCarrito();
}

function quitarDelCarrito(productoId, especificacion) {
    const idx = carrito.findIndex(item => item.id == productoId && item.especificacion === especificacion);
    if (idx !== -1) {
        if (carrito[idx].cantidad > 1) {
            carrito[idx].cantidad -= 1;
        } else {
            carrito.splice(idx, 1);
        }
        guardarCarrito();
        renderizarCarrito();
    }
}

function eliminarItemCarrito(productoId, especificacion) {
    const idx = carrito.findIndex(item => item.id == productoId && item.especificacion === especificacion);
    if (idx !== -1) {
        carrito.splice(idx, 1);
        guardarCarrito();
        renderizarCarrito();
    }
}

function abrirCarrito() {
    if (!cartOverlay || !cartSidebar) return;
    cartOverlay.classList.add('active');
    cartSidebar.classList.add('open');
    bloquearScroll();
}

function cerrarCarrito() {
    if (!cartOverlay || !cartSidebar) return;
    cartOverlay.classList.remove('active');
    cartSidebar.classList.remove('open');
    desbloquearScroll();
}

function renderizarCarrito() {
    if (!cartItems || !cartTotalPrice) return;

    if (carrito.length === 0) {
        cartItems.innerHTML = `<p class="cart-empty">El carrito está vacío.</p>`;
        cartTotalPrice.textContent = '$0,00';
        return;
    }

    let html = '';
    let total = 0;
    carrito.forEach((item) => {
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        const cantidad = item.cantidad || 0;
        const subtotal = price * cantidad;
        total += subtotal;
        const espec = item.especificacion ? ` (${item.especificacion})` : '';
        html += `
            <div class="cart-item" data-id="${item.id}" data-espec="${item.especificacion || ''}">
                <div class="item-info">
                    <div class="item-name">${item.name}${espec}</div>
                    <div class="item-price">$${formatearPrecio(price)} c/u</div>
                </div>
                <div class="item-qty">
                    <button class="qty-btn" data-action="minus" data-id="${item.id}" data-espec="${item.especificacion || ''}">−</button>
                    <span>${cantidad}</span>
                    <button class="qty-btn" data-action="plus" data-id="${item.id}" data-espec="${item.especificacion || ''}">+</button>
                </div>
                <button class="item-remove" data-id="${item.id}" data-espec="${item.especificacion || ''}">✕</button>
            </div>
        `;
    });

    cartItems.innerHTML = html;
    cartTotalPrice.textContent = `$${formatearPrecio(total)}`;

    cartItems.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            const espec = this.dataset.espec || '';
            if (this.dataset.action === 'plus') {
                const prod = productos.find(p => p.id == id);
                if (prod) {
                    agregarAlCarritoConEspec(id, espec);
                }
            } else {
                quitarDelCarrito(id, espec);
            }
        });
    });

    cartItems.querySelectorAll('.item-remove').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            const espec = this.dataset.espec || '';
            const item = carrito.find(i => i.id == id && i.especificacion === espec);
            if (item && confirm(`¿Eliminar "${item.name}" del carrito?`)) {
                eliminarItemCarrito(id, espec);
            }
        });
    });
}

function generarMensajeWhatsApp() {
    if (carrito.length === 0) {
        alert('El carrito está vacío. Agrega productos primero.');
        return;
    }
    let mensaje = '¡Hola! Me interesan estos productos:\n\n';
    let total = 0;
    carrito.forEach(item => {
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        const cantidad = item.cantidad || 0;
        const subtotal = price * cantidad;
        total += subtotal;
        let detalle = `• ${item.name} x ${cantidad} = $${formatearPrecio(subtotal)}`;
        if (item.especificacion && item.especificacion.trim()) {
            detalle += ` (${item.especificacion.trim()})`;
        }
        mensaje += detalle + '\n';
    });
    mensaje += `\nTotal: $${formatearPrecio(total)}`;
    mensaje += `\n\n¡Gracias!`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// ============================================
// API Y NORMALIZACIÓN
// ============================================
function normalizarProducto(prod) {
    if (!prod.images || !Array.isArray(prod.images)) {
        prod.images = ['https://picsum.photos/seed/' + encodeURIComponent(prod.name || 'default') + '/400/400'];
    }
    if (!prod.colors || !Array.isArray(prod.colors)) prod.colors = [];
    if (prod.visible === undefined) prod.visible = true;
    if (!prod.category) prod.category = 'General';
    if (!prod.description) prod.description = '';
    if (!prod.sizes || !Array.isArray(prod.sizes)) prod.sizes = [];
    if (!prod.stock) prod.stock = 0;
    prod.price = typeof prod.price === 'number' ? prod.price : parseFloat(prod.price) || 0;
    return prod;
}

async function cargarProductos(page = 1, filters = {}) {
    try {
        let url = `${API_URL}?page=${page}&limit=20`;
        if (filters.category && filters.category !== 'all') {
            url += `&category=${encodeURIComponent(filters.category)}`;
        }
        if (filters.search) {
            url += `&search=${encodeURIComponent(filters.search)}`;
        }
        if (filters.visible !== undefined) {
            url += `&visible=${filters.visible}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al cargar productos');
        const data = await res.json();
        productos = data.productos.map(normalizarProducto);
        totalPaginas = data.totalPages;
        paginaActual = data.page;
        return { productos, total: data.total, totalPages: data.totalPages };
    } catch (error) {
        console.error('Error cargando productos:', error);
        return { productos: [], total: 0, totalPages: 0 };
    }
}

async function guardarProductoAPI(producto, index) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (jwtToken) {
            headers['Authorization'] = `Bearer ${jwtToken}`;
        }
        let res;
        if (index >= 0 && index < productos.length) {
            res = await fetch(`${API_URL}/${producto.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(producto)
            });
        } else {
            res = await fetch(API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(producto)
            });
        }
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                alert('Tu sesión ha expirado. Vuelve a iniciar sesión.');
                cerrarSesion();
                return null;
            }
            const errorData = await res.text();
            throw new Error(`Error al guardar: ${res.status} - ${errorData}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error guardando producto:', error);
        alert(`Hubo un error al guardar el producto: ${error.message}`);
        return null;
    }
}

async function eliminarProductoAPI(id, index) {
    try {
        const headers = {};
        if (jwtToken) {
            headers['Authorization'] = `Bearer ${jwtToken}`;
        }
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers });
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                alert('Tu sesión ha expirado. Vuelve a iniciar sesión.');
                cerrarSesion();
                return false;
            }
            throw new Error('Error al eliminar');
        }
        return true;
    } catch (error) {
        console.error('Error eliminando producto:', error);
        alert('Hubo un error al eliminar el producto.');
        return false;
    }
}

async function validarTokenURL(token) {
    try {
        const res = await fetch(`${AUTH_URL}/validar-token?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
            const error = await res.json();
            console.warn('Token inválido:', error.error);
            return false;
        }
        const data = await res.json();
        return data.valido === true;
    } catch (error) {
        console.error('Error validando token:', error);
        return false;
    }
}

async function iniciarSesion(username, password) {
    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            let errorMsg;
            try {
                const errorData = await res.json();
                errorMsg = errorData.error || `Error ${res.status}: ${res.statusText}`;
            } catch (e) {
                errorMsg = `Error ${res.status}: ${res.statusText}`;
            }
            throw new Error(errorMsg);
        }
        const data = await res.json();
        if (!data.token) {
            throw new Error('El servidor no devolvió un token de autenticación.');
        }
        jwtToken = data.token;
        console.log('✅ JWT Token obtenido correctamente');
        return true;
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
}

// ============================================
// DATALISTS Y FILTROS
// ============================================
function getCategoriasUnicas() {
    const cats = productos.map(p => p.category).filter(c => c && c.trim());
    return [...new Set(cats)].sort();
}

function getColoresUnicos() {
    const todos = productos.flatMap(p => (p.colors || []).filter(c => typeof c === 'string' && c.trim().length > 0));
    return [...new Set(todos)].sort();
}

function actualizarDatalists() {
    if (categoryList) categoryList.innerHTML = getCategoriasUnicas().map(c => `<option value="${c}">`).join('');
    if (colorList) colorList.innerHTML = getColoresUnicos().map(c => `<option value="${c}">`).join('');
}

// ============================================
// FILTROS (con filtro por color)
// ============================================
async function actualizarFiltros() {
    try {
        const res = await fetch('/api/productos/categorias');
        if (!res.ok) throw new Error('Error al cargar categorías');
        const categorias = await res.json();
        let html = `<button class="filter-btn active" data-filter="all">Todos</button>`;
        categorias.forEach(cat => {
            const active = filtroCategoria === cat ? 'active' : '';
            html += `<button class="filter-btn ${active}" data-filter="${cat}">${cat}</button>`;
        });

        // Agregar filtro por color si está activo
        if (filtroColor) {
            html += `<button class="filter-btn color-filter" onclick="limpiarFiltroColor()">Filtrando por: ${filtroColor} ✕</button>`;
        }

        if (filterContainer) filterContainer.innerHTML = html;
        document.querySelectorAll('.filter-btn:not(.color-filter)').forEach(btn => {
            btn.addEventListener('click', async function() {
                filtroCategoria = this.dataset.filter;
                // Limpiar filtro de color al cambiar categoría
                filtroColor = null;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                await cargarPagina(1);
            });
        });
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Función global para limpiar filtro de color
window.limpiarFiltroColor = function() {
    filtroColor = null;
    cargarPagina(1);
};

// ============================================
// CARGAR PÁGINA (con filtro por color)
// ============================================
async function cargarPagina(page) {
    const filters = {
        category: filtroCategoria,
        visible: true
    };
    // Si hay filtro de color, lo pasamos al backend para filtrar
    if (filtroColor) {
        // Nota: El backend debería soportar filtro por color.
        // Como no lo soporta, filtramos en el frontend (por simplicidad)
        await cargarProductos(page, { category: filtroCategoria, visible: true });
        // Aplicar filtro de color en frontend
        if (filtroColor) {
            productos = productos.filter(p => (p.colors || []).includes(filtroColor));
            // Recalcular totalPages
            totalPaginas = Math.ceil(productos.length / 20);
        }
        renderizarCatalogo();
    } else {
        await cargarProductos(page, { category: filtroCategoria, visible: true });
        renderizarCatalogo();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// RENDER CATÁLOGO (con colores filtrables)
// ============================================
function renderizarCatalogo(conPaginacion = true) {
    if (!catalogContainer) return;

    // Si hay filtro de color, filtrar productos
    let productosMostrar = productos;
    if (filtroColor) {
        productosMostrar = productos.filter(p => (p.colors || []).includes(filtroColor));
    }

    const visibles = productosMostrar.filter(p => p.visible !== false);
    if (visibles.length === 0) {
        catalogContainer.innerHTML = `<p class="empty-msg">No hay productos disponibles.</p>`;
        return;
    }
    const grupos = {};
    visibles.forEach(prod => {
        const cat = prod.category || 'Sin categoría';
        if (!grupos[cat]) grupos[cat] = [];
        grupos[cat].push(prod);
    });
    const categorias = Object.keys(grupos).sort();
    let html = '';
    categorias.forEach(cat => {
        const items = grupos[cat];
        html += `<div class="category-section"><h2 class="category-title">${cat}</h2><div class="category-grid">`;
        items.forEach(prod => {
            const images = (prod.images && prod.images.length > 0) ? prod.images : ['https://picsum.photos/seed/default/400/400'];
            const colors = (prod.colors || []).filter(c => c && c.trim().length > 0);

            let carouselHtml = `<div class="carousel" data-id="${prod.id}"><div class="slides" style="transform: translateX(0%);">`;
            images.forEach(img => {
                carouselHtml += `<img src="${img}" alt="${prod.name}" loading="lazy">`;
            });
            carouselHtml += `</div>
                <button class="nav-btn prev" data-id="${prod.id}"><svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
                <button class="nav-btn next" data-id="${prod.id}"><svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg></button>
                <div class="dots">`;
            images.forEach((_, idx) => {
                carouselHtml += `<span class="${idx === 0 ? 'active' : ''}" data-id="${prod.id}" data-index="${idx}"></span>`;
            });
            carouselHtml += `</div></div>`;

            // Colores con funcionalidad de filtro
            let colorsHtml = '';
            if (colors.length) {
                colorsHtml = `<div class="colors">`;
                colors.forEach(color => {
                    const bgColor = CSS.supports('color', color) ? color : '#ccc';
                    const isActive = filtroColor === color ? 'active-color' : '';
                    colorsHtml += `<span class="color-dot ${isActive}" 
                                    style="background:${bgColor};" 
                                    title="${color}" 
                                    data-color="${color}"
                                    onclick="filtrarPorColor('${color}')"></span>`;
                });
                colorsHtml += `</div>`;
            }

            const price = typeof prod.price === 'number' ? prod.price : parseFloat(prod.price) || 0;

            html += `
                <div class="product-card">
                    ${carouselHtml}
                    <div class="info">
                        <span class="name">${prod.name}</span>
                        <span class="price">$${formatearPrecio(price)}</span>
                        <span class="desc">${prod.description || ''}</span>
                        ${colorsHtml}
                        <button class="btn-add-cart" data-id="${prod.id}">🛒 Agregar al carrito</button>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
    });
    if (conPaginacion && totalPaginas > 1) {
        html += `
            <div class="pagination">
                <button class="page-btn" data-page="${paginaActual - 1}" ${paginaActual <= 1 ? 'disabled' : ''}>Anterior</button>
                <span class="page-info">Página ${paginaActual} de ${totalPaginas}</span>
                <button class="page-btn" data-page="${paginaActual + 1}" ${paginaActual >= totalPaginas ? 'disabled' : ''}>Siguiente</button>
            </div>
        `;
    }
    catalogContainer.innerHTML = html;

    // Carruseles
    document.querySelectorAll('.carousel').forEach(carousel => {
        const id = carousel.dataset.id;
        const slides = carousel.querySelector('.slides');
        const total = slides.querySelectorAll('img').length;
        if (total <= 1) {
            carousel.querySelectorAll('.nav-btn, .dots').forEach(el => el.style.display = 'none');
            return;
        }
        let current = 0;
        const prevBtn = carousel.querySelector('.prev');
        const nextBtn = carousel.querySelector('.next');
        const dots = carousel.querySelectorAll('.dots span');
        const updateCarousel = () => {
            slides.style.transform = `translateX(-${current * 100}%)`;
            dots.forEach((dot, idx) => dot.classList.toggle('active', idx === current));
        };
        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); current = (current - 1 + total) % total; updateCarousel(); });
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); current = (current + 1) % total; updateCarousel(); });
        dots.forEach((dot, idx) => {
            dot.addEventListener('click', (e) => { e.stopPropagation(); current = idx; updateCarousel(); });
        });
    });

    // Paginación
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const page = parseInt(this.dataset.page);
            if (page > 0 && page <= totalPaginas) await cargarPagina(page);
        });
    });

    // Carrito - ABRIR MODAL DE ESPECIFICACIONES
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            const prod = productos.find(p => p.id == id);
            if (prod) {
                abrirModalEspecificaciones(prod);
            }
        });
    });

    // Modal de imagen al hacer clic en la imagen
    document.querySelectorAll('.carousel .slides img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (this.src) {
                abrirModalImagen(this.src);
            }
        });
    });
}

// Función global para filtrar por color
window.filtrarPorColor = function(color) {
    if (filtroColor === color) {
        filtroColor = null;
    } else {
        filtroColor = color;
    }
    // Actualizar UI de colores
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.toggle('active-color', dot.dataset.color === filtroColor);
    });
    cargarPagina(1);
};

// ============================================
// RENDER LISTA ADMIN
// ============================================
function renderizarListaAdmin() {
    if (!adminProductList) return;
    if (productos.length === 0) {
        adminProductList.innerHTML = `<p style="color:#777;">No hay productos.</p>`;
        return;
    }
    let html = '';
    productos.forEach((prod, index) => {
        const status = prod.visible !== false ? 'Visible' : 'Oculto';
        const toggleLabel = prod.visible !== false ? 'Ocultar' : 'Mostrar';
        const toggleClass = prod.visible !== false ? '' : 'off';
        const categoryTag = prod.category ? `<span class="category-tag" data-type="category" title="Doble clic para eliminar">${prod.category}</span>` : '';
        const colorTags = (prod.colors || []).filter(c => c && c.trim()).map(c =>
            `<span class="color-tag" data-type="color" title="Doble clic para eliminar">${c}</span>`
        ).join('');
        html += `
            <div class="admin-item" data-index="${index}">
                <div class="info">
                    <span class="name">${prod.name}</span>
                    <span class="price">$${formatearPrecio(prod.price)}</span>
                    <span style="font-size:0.7rem;color:#999;margin-left:0.3rem;">${categoryTag} ${colorTags}</span>
                    <span class="status">(${status})</span>
                </div>
                <div class="actions">
                    <button class="toggle-btn ${toggleClass}" data-index="${index}">${toggleLabel}</button>
                    <button class="edit-btn" data-index="${index}">Editar</button>
                    <button class="delete-btn" data-index="${index}">Eliminar</button>
                </div>
            </div>
        `;
    });
    adminProductList.innerHTML = html;

    adminProductList.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index, 10);
            toggleVisibilidad(idx);
        });
    });
    adminProductList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index, 10);
            iniciarEdicion(idx);
        });
    });
    adminProductList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index, 10);
            eliminarProducto(idx);
        });
    });

    document.querySelectorAll('.admin-item .category-tag, .admin-item .color-tag').forEach(el => {
        el.addEventListener('dblclick', async function(e) {
            e.stopPropagation();
            const item = this.closest('.admin-item');
            const index = parseInt(item.dataset.index, 10);
            const prod = productos[index];
            if (!prod) return;
            const tipo = this.dataset.type;
            const valor = this.textContent.trim();

            if (tipo === 'category') {
                if (confirm(`¿Eliminar la categoría "${valor}" de este producto?`)) {
                    prod.category = '';
                    await guardarProductoAPI(prod, index);
                    await cargarProductos(paginaActual, { category: filtroCategoria, visible: true });
                    actualizarFiltros();
                    renderizarCatalogo();
                    renderizarListaAdmin();
                    actualizarDatalists();
                }
            } else if (tipo === 'color') {
                if (confirm(`¿Eliminar el color "${valor}" de este producto?`)) {
                    prod.colors = prod.colors.filter(c => c !== valor);
                    await guardarProductoAPI(prod, index);
                    await cargarProductos(paginaActual, { category: filtroCategoria, visible: true });
                    renderizarCatalogo();
                    renderizarListaAdmin();
                    actualizarDatalists();
                }
            }
        });
    });
}

// ============================================
// CRUD
// ============================================
async function guardarProductoHandler(e) {
    e.preventDefault();
    const nombre = prodName.value.trim();
    const precio = parseFloat(prodPrice.value);
    const categoria = prodCategory.value.trim();
    const desc = prodDesc.value.trim();
    let colors = prodColors.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const visible = prodVisible.checked;

    if (!nombre) { alert('El nombre es obligatorio.'); return; }
    if (isNaN(precio) || precio < 0) { alert('Ingresa un precio válido.'); return; }
    if (!categoria) { alert('La categoría es obligatoria.'); return; }

    let images = currentImages.length > 0 ? currentImages : ['https://picsum.photos/seed/' + encodeURIComponent(nombre) + '/400/400'];

    const producto = {
        name: nombre,
        price: precio,
        category: categoria,
        description: desc,
        images: images,
        colors: colors,
        visible: visible,
        stock: 0,
        sizes: []
    };

    const idx = parseInt(editIndexInput.value, 10);
    if (idx >= 0 && idx < productos.length) {
        producto.id = productos[idx].id;
    }

    const resultado = await guardarProductoAPI(producto, idx);
    if (resultado) {
        await cargarProductos(paginaActual, { category: filtroCategoria, visible: true });
        actualizarFiltros();
        renderizarCatalogo();
        renderizarListaAdmin();
        actualizarDatalists();
        resetFormulario();
        cancelarEdicion();
    }
}

async function eliminarProducto(index) {
    if (index < 0 || index >= productos.length) return;
    const nombre = productos[index].name;
    if (confirm(`¿Eliminar "${nombre}" definitivamente?`)) {
        const prod = productos[index];
        const eliminado = await eliminarProductoAPI(prod.id, index);
        if (eliminado) {
            await cargarProductos(paginaActual, { category: filtroCategoria, visible: true });
            actualizarFiltros();
            renderizarCatalogo();
            renderizarListaAdmin();
            actualizarDatalists();
            if (parseInt(editIndexInput.value, 10) === index) cancelarEdicion();
            else if (parseInt(editIndexInput.value, 10) > index) editIndexInput.value = parseInt(editIndexInput.value, 10) - 1;
        }
    }
}

async function toggleVisibilidad(index) {
    try {
        if (index < 0 || index >= productos.length) return;
        const prod = productos[index];
        prod.visible = prod.visible === false ? true : false;
        const resultado = await guardarProductoAPI(prod, index);
        if (resultado) {
            await cargarProductos(paginaActual, { category: filtroCategoria, visible: true });
            actualizarFiltros();
            renderizarCatalogo();
            renderizarListaAdmin();
        }
    } catch (error) {
        console.error('Error al cambiar visibilidad:', error);
        alert('Hubo un error al cambiar la visibilidad.');
    }
}

function iniciarEdicion(index) {
    const prod = productos[index];
    if (!prod) return;
    editIndexInput.value = index;
    prodName.value = prod.name || '';
    prodPrice.value = prod.price || '';
    prodCategory.value = prod.category || '';
    prodDesc.value = prod.description || '';
    prodColors.value = (prod.colors || []).join(', ');
    prodVisible.checked = prod.visible !== false;
    currentImages = prod.images ? [...prod.images] : [];
    renderImagePreview();
    prodImageUrls.value = '';
    prodImageFiles.value = '';
    document.getElementById('saveProductBtn').textContent = 'Actualizar Producto';
    cancelEditBtn.style.display = 'inline-block';
}

function cancelarEdicion() {
    resetFormulario();
    editIndexInput.value = -1;
    document.getElementById('saveProductBtn').textContent = 'Guardar Producto';
    cancelEditBtn.style.display = 'none';
}

function resetFormulario() {
    productForm.reset();
    prodImageFiles.value = '';
    prodImageUrls.value = '';
    currentImages = [];
    renderImagePreview();
    prodVisible.checked = true;
}

// ============================================
// IMÁGENES
// ============================================
function renderImagePreview() {
    if (!imagePreviewContainer) return;
    imagePreviewContainer.innerHTML = '';
    currentImages.forEach((img, idx) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        const imgEl = document.createElement('img');
        imgEl.src = img;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-img';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImages.splice(idx, 1);
            renderImagePreview();
        });
        div.appendChild(imgEl);
        div.appendChild(removeBtn);
        imagePreviewContainer.appendChild(div);
    });
}

function agregarUrlsDesdeInput() {
    const urls = prodImageUrls.value.split(',').map(s => s.trim()).filter(s => s);
    if (urls.length > 0) {
        urls.forEach(url => {
            if (url && !currentImages.includes(url)) {
                currentImages.push(url);
            }
        });
        prodImageUrls.value = '';
        renderImagePreview();
    }
}

// ============================================
// BOTÓN ADMIN
// ============================================
function mostrarBotonAdmin() {
    let btn = document.getElementById('btnAdmin');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btnAdmin';
        btn.className = 'btn-admin';
        btn.addEventListener('click', () => {
            if (jwtToken) {
                abrirAdmin();
            } else {
                abrirLogin();
            }
        });
        const container = document.getElementById('adminButtonContainer');
        if (container) {
            container.appendChild(btn);
        } else {
            console.warn('⚠️ No se encontró #adminButtonContainer');
            return;
        }
    }
    btn.classList.add('visible');
    btn.textContent = jwtToken ? 'Panel Admin' : '🔐 Acceso Admin';
}

function actualizarBotonAdmin() {
    const btn = document.getElementById('btnAdmin');
    if (btn) {
        btn.textContent = jwtToken ? 'Panel Admin' : '🔐 Acceso Admin';
    }
}

function ocultarBotonAdmin() {
    const btn = document.getElementById('btnAdmin');
    if (btn) btn.remove();
}

// ============================================
// VERIFICAR TOKEN URL
// ============================================
async function verificarAccesoAdmin() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (!token) {
        tokenUrlValido = false;
        return;
    }
    const valido = await validarTokenURL(token);
    if (valido) {
        tokenUrlValido = true;
        mostrarBotonAdmin();
    } else {
        tokenUrlValido = false;
        alert('El enlace de acceso no es válido o ha expirado.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ============================================
// LOGIN / SESIÓN
// ============================================
async function manejarLogin(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    try {
        await iniciarSesion(user, pass);
        loginError.textContent = '';
        cerrarLogin();
        actualizarBotonAdmin();
        setTimeout(() => {
            abrirAdmin();
        }, 200);
    } catch (error) {
        loginError.textContent = error.message || 'Usuario o contraseña incorrectos.';
        console.error('Error en login:', error);
    }
}

function cerrarSesion() {
    if (confirm('¿Cerrar sesión de administrador?')) {
        jwtToken = null;
        tokenUrlValido = false;
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('token');
        const nuevaUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, document.title, nuevaUrl);
        ocultarBotonAdmin();
        cerrarAdmin();
        cerrarLogin();
        window.location.reload();
    }
}

function abrirLogin() {
    if (!loginModal) return;
    loginModal.classList.add('active');
    document.getElementById('loginUser')?.focus();
}

function cerrarLogin() {
    if (!loginModal) return;
    loginModal.classList.remove('active');
    loginForm.reset();
    if (loginError) loginError.textContent = '';
    desbloquearScroll();
}

function abrirAdmin() {
    if (!jwtToken) {
        abrirLogin();
        return;
    }
    if (!adminModal) {
        console.warn('⚠️ No se encontró el modal admin');
        return;
    }
    adminModal.classList.add('active');
    renderizarListaAdmin();
    actualizarDatalists();
    cancelarEdicion();
}

function cerrarAdmin() {
    if (!adminModal) return;
    adminModal.classList.remove('active');
    desbloquearScroll();
}

// ============================================
// RESET
// ============================================
async function resetearDatos() {
    if (confirm('¿Borrar todos los productos?')) {
        try {
            await fetch('/api/reset', { method: 'POST' });
        } catch (e) { console.warn('Reset API falló'); }
        localStorage.removeItem('productos');
        window.location.reload();
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
async function init() {
    cargarCarrito();
    await cargarProductos(1, { category: 'all', visible: true });
    await verificarAccesoAdmin();
    await actualizarFiltros();
    renderizarCatalogo();
    renderizarCarrito();

    // Eventos carrito
    if (cartToggle) cartToggle.addEventListener('click', abrirCarrito);
    if (cartClose) cartClose.addEventListener('click', cerrarCarrito);
    if (cartOverlay) cartOverlay.addEventListener('click', cerrarCarrito);
    if (cartWhatsApp) cartWhatsApp.addEventListener('click', generarMensajeWhatsApp);

    // Eventos modal de especificaciones
    if (especCancel) especCancel.addEventListener('click', cerrarModalEspecificaciones);
    if (especConfirm) especConfirm.addEventListener('click', confirmarAgregarAlCarrito);
    if (especModal) {
        especModal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalEspecificaciones();
            }
        });
        if (especInput) {
            especInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmarAgregarAlCarrito();
                }
                if (e.key === 'Escape') {
                    cerrarModalEspecificaciones();
                }
            });
        }
    }

    // Eventos modal de imagen
    if (imageModalClose) imageModalClose.addEventListener('click', cerrarModalImagen);
    if (imageModal) {
        imageModal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalImagen();
            }
        });
    }

    // Admin eventos
    if (loginClose) loginClose.addEventListener('click', cerrarLogin);
    if (adminClose) adminClose.addEventListener('click', cerrarAdmin);
    if (logoutBtn) logoutBtn.addEventListener('click', cerrarSesion);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelarEdicion);
    if (resetDataBtn) resetDataBtn.addEventListener('click', resetearDatos);
    if (loginForm) loginForm.addEventListener('submit', manejarLogin);
    if (productForm) productForm.addEventListener('submit', guardarProductoHandler);

    // Imágenes automáticas
    if (prodImageFiles) {
        prodImageFiles.addEventListener('change', function(e) {
            const files = e.target.files;
            if (files.length > 0) {
                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = function(ev) {
                        const base64 = ev.target.result;
                        if (!currentImages.includes(base64)) {
                            currentImages.push(base64);
                            renderImagePreview();
                        }
                    };
                    reader.readAsDataURL(file);
                });
                prodImageFiles.value = '';
            }
        });
    }

    if (prodImageUrls) {
        prodImageUrls.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                agregarUrlsDesdeInput();
            }
        });
        prodImageUrls.addEventListener('blur', agregarUrlsDesdeInput);
    }

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                if (this === loginModal) {
                    cerrarLogin();
                } else if (this === adminModal) {
                    cerrarAdmin();
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
