/**
 * ========================================
 *  CATÁLOGO DE ROPA – CON MYSQL + JWT
 *  Autenticación con token en URL
 *  y JWT para operaciones protegidas
 * ========================================
 */

// ============================================
// CONFIGURACIÓN
// ============================================
const API_URL = '/api/productos';
const AUTH_URL = '/api/auth';

// ============================================
// ESTADO GLOBAL
// ============================================
let productos = [];
let jwtToken = null;               // Token JWT (se guarda en memoria)
let tokenUrlValido = false;        // Indica si el token de URL es válido
let editandoIndex = -1;
let filtroCategoria = 'all';
let paginaActual = 1;
let totalPaginas = 1;
let currentImages = [];

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

// ============================================
// FUNCIONES DE NORMALIZACIÓN
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
  return prod;
}

// ============================================
// FUNCIONES DE API (con JWT)
// ============================================
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
    // Si hay JWT, lo añadimos al header
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
      throw new Error('Error al guardar');
    }
    return await res.json();
  } catch (error) {
    console.error('Error guardando producto:', error);
    alert('Hubo un error al guardar el producto.');
    return null;
  }
}

async function eliminarProductoAPI(id, index) {
  try {
    const headers = {};
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers
    });
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

// ============================================
// VALIDACIÓN DEL TOKEN DE URL
// ============================================
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

// ============================================
// LOGIN (obtener JWT)
// ============================================
async function iniciarSesion(username, password) {
  try {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Credenciales inválidas');
    }

    const data = await res.json();
    jwtToken = data.token; // Guardamos el JWT en memoria
    return true;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

// ============================================
// DATALISTS Y FILTROS (sin cambios)
// ============================================
function getCategoriasUnicas() {
  const cats = productos.map(p => p.category).filter(c => c && c.trim());
  return [...new Set(cats)].sort();
}

function getColoresUnicos() {
  const todos = productos.flatMap(p => {
    if (!p.colors || !Array.isArray(p.colors)) return [];
    return p.colors.filter(c => typeof c === 'string' && c.trim().length > 0);
  });
  return [...new Set(todos)].sort();
}

function actualizarDatalists() {
  categoryList.innerHTML = getCategoriasUnicas().map(c => `<option value="${c}">`).join('');
  colorList.innerHTML = getColoresUnicos().map(c => `<option value="${c}">`).join('');
}

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
    filterContainer.innerHTML = html;
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        filtroCategoria = this.dataset.filter;
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        await cargarPagina(1);
      });
    });
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

async function cargarPagina(page) {
  await cargarProductos(page, { category: filtroCategoria, visible: true });
  renderizarCatalogo();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// RENDERIZADO DEL CATÁLOGO (sin cambios)
// ============================================
function renderizarCatalogo(conPaginacion = true) {
  if (!catalogContainer) return;
  const visibles = productos.filter(p => p.visible !== false);
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
      const colors = prod.colors || [];
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
      let colorsHtml = '';
      if (colors.length) {
        colorsHtml = `<div class="colors">`;
        colors.forEach(color => {
          const isColor = CSS.supports('color', color);
          const bgColor = isColor ? color : '#ccc';
          colorsHtml += `<span class="color-dot" style="background:${bgColor};" title="${color}"></span>`;
        });
        colorsHtml += `</div>`;
      }
      html += `
        <div class="product-card">
          ${carouselHtml}
          <div class="info">
            <span class="name">${prod.name}</span>
            <span class="price">$${Number(prod.price).toFixed(2)}</span>
            <span class="desc">${prod.description || ''}</span>
            ${colorsHtml}
            <button class="btn-interest" data-id="${prod.id}">Me interesa</button>
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

  // Eventos de paginación
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const page = parseInt(this.dataset.page);
      if (page > 0 && page <= totalPaginas) await cargarPagina(page);
    });
  });

  // Eventos "Me interesa"
  document.querySelectorAll('.btn-interest').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      const producto = productos.find(p => p.id == id);
      if (producto) alert(`¡Gracias por tu interés en "${producto.name}"!`);
    });
  });
}

// ============================================
// RENDER LISTA ADMIN (con JWT)
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
    const colorTags = (prod.colors || []).map(c =>
      `<span class="color-tag" data-type="color" title="Doble clic para eliminar">${c}</span>`
    ).join('');
    html += `
      <div class="admin-item" data-index="${index}">
        <div class="info">
          <span class="name">${prod.name}</span>
          <span class="price">$${Number(prod.price).toFixed(2)}</span>
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

  // Doble clic para eliminar categoría/color (funciona igual)
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
// CRUD (con JWT)
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
// IMÁGENES (preview y automático)
// ============================================
function renderImagePreview() {
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
// BOTÓN ADMIN (basado en token de URL)
// ============================================
function mostrarBotonAdmin() {
  if (document.getElementById('btnAdmin')) return;
  const btn = document.createElement('button');
  btn.id = 'btnAdmin';
  btn.className = 'btn-admin';
  btn.textContent = jwtToken ? 'Panel Admin' : '🔐 Acceso Admin';
  btn.addEventListener('click', () => {
    if (jwtToken) {
      abrirAdmin();
    } else {
      abrirLogin();
    }
  });
  adminButtonContainer.appendChild(btn);
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
// VERIFICACIÓN DEL TOKEN DE URL
// ============================================
async function verificarAccesoAdmin() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    // No hay token en URL → sin acceso admin
    tokenUrlValido = false;
    return;
  }

  // Validar el token con el backend
  const valido = await validarTokenURL(token);
  if (valido) {
    tokenUrlValido = true;
    // Mostramos el botón de acceso (sin JWT aún)
    mostrarBotonAdmin();
  } else {
    tokenUrlValido = false;
    // Opcional: mostrar un mensaje de error o eliminar el token de la URL
    alert('El enlace de acceso no es válido o ha expirado.');
    // Limpiar la URL (eliminar el token)
    const nuevaUrl = window.location.pathname;
    window.history.replaceState({}, document.title, nuevaUrl);
  }
}

// ============================================
// LOGIN / SESIÓN (con JWT)
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
    abrirAdmin();
  } catch (error) {
    loginError.textContent = error.message || 'Usuario o contraseña incorrectos.';
  }
}

function cerrarSesion() {
  if (confirm('¿Cerrar sesión de administrador?')) {
    // Eliminar JWT de memoria
    jwtToken = null;
    tokenUrlValido = false;

    // Eliminar el token de la URL (si existe)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) {
      urlParams.delete('token');
      const nuevaUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, document.title, nuevaUrl);
    }

    // Ocultar botón y cerrar modales
    ocultarBotonAdmin();
    cerrarAdmin();
    cerrarLogin();

    // Recargar la página para limpiar estado
    window.location.reload();
  }
}

function abrirLogin() {
  loginModal.classList.add('active');
  document.getElementById('loginUser').focus();
}

function cerrarLogin() {
  loginModal.classList.remove('active');
  loginForm.reset();
  loginError.textContent = '';
}

function abrirAdmin() {
  if (!jwtToken) {
    abrirLogin();
    return;
  }
  adminModal.classList.add('active');
  renderizarListaAdmin();
  actualizarDatalists();
  cancelarEdicion();
}

function cerrarAdmin() {
  adminModal.classList.remove('active');
}

// ============================================
// RESET (opcional)
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
  // 1. Cargar productos públicos
  await cargarProductos(1, { category: 'all', visible: true });

  // 2. Verificar token en URL
  await verificarAccesoAdmin();

  // 3. Actualizar filtros y renderizar catálogo
  await actualizarFiltros();
  renderizarCatalogo();

  // ============================================
  // EVENTOS
  // ============================================

  // Login
  loginClose.addEventListener('click', cerrarLogin);
  adminClose.addEventListener('click', cerrarAdmin);
  logoutBtn.addEventListener('click', cerrarSesion);
  cancelEditBtn.addEventListener('click', cancelarEdicion);
  resetDataBtn.addEventListener('click', resetearDatos);
  loginForm.addEventListener('submit', manejarLogin);
  productForm.addEventListener('submit', guardarProductoHandler);

  // Imágenes automáticas
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

  prodImageUrls.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarUrlsDesdeInput();
    }
  });
  prodImageUrls.addEventListener('blur', agregarUrlsDesdeInput);

  // Cerrar modales al hacer clic en overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) {
        if (this === loginModal) cerrarLogin();
        else if (this === adminModal) cerrarAdmin();
      }
    });
  });

  // ============================================
  // DOBLE CLIC ELIMINADO COMPLETAMENTE
  // ============================================
  // Ya no hay listener para doble clic en el logo.
  // El único acceso es mediante el token en la URL.
}

// ============================================
// INICIO
// ============================================
document.addEventListener('DOMContentLoaded', init);