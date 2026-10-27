import { _supabase } from './supabaseClient.js';
import { usuarioActualEmail, iniciarSesionExitosa } from './auth.js';
import { agregarAlCarrito } from './carrito.js';

export let todosLosProductos = [];
let fotoBase64Actual = '';
let productosParaCargarMasiva = [];
let timerBusqueda = null;

export function obtenerCodigoBarras(prod) { return prod.codigo_barras || prod.codigo_barra || ''; }
export function obtenerPrecioMayorista(prod) { return parseFloat(prod.precio_mayorista || prod.precio_mayorist || 0); }
export function obtenerCantMayorista(prod) { return parseInt(prod.cantidad_mayorista || prod.cantidad_mayor || 6); }
export function obtenerUnidadesPorBulto(prod) { return parseInt(prod.unidades_por_bulto || prod.unidades_bulto || 0); }

export async function cargarProductos() {
  const contenedor = document.getElementById('productosList');
  if (!navigator.onLine) {
    cargarProductosOffline();
    return;
  }

  contenedor.innerHTML = '<p class="text-slate-400 text-sm text-center py-4 col-span-full">Actualizando catálogo...</p>';

  const { data, error } = await _supabase.from('productos').select('*').eq('activo', true).range(0, 1999);

  if (error || !data) {
    cargarProductosOffline();
    return;
  }

  todosLosProductos = data;
  localStorage.setItem('go_pos_productos', JSON.stringify(data));
  iniciarSesionExitosa(usuarioActualEmail, data);
  mostrarProductos(todosLosProductos.slice(0, 40));
}

function cargarProductosOffline() {
  const cached = localStorage.getItem('go_pos_productos');
  if (cached) {
    todosLosProductos = JSON.parse(cached);
    iniciarSesionExitosa(usuarioActualEmail, todosLosProductos);
    mostrarProductos(todosLosProductos.slice(0, 40));
  } else {
    document.getElementById('productosList').innerHTML = '<p class="text-red-500 text-sm text-center col-span-full">Sin internet y sin catálogo guardado.</p>';
    iniciarSesionExitosa(usuarioActualEmail, []);
  }
}

export function mostrarProductos(productos) {
  const contenedor = document.getElementById('productosList');
  if (!productos || productos.length === 0) {
    contenedor.innerHTML = '<p class="text-slate-400 text-sm text-center py-4 col-span-full">No se encontraron productos.</p>';
    return;
  }

  const esAdmin = (usuarioActualEmail || '').toLowerCase().includes('admi');
  let htmlContent = '';

  productos.forEach((prod, idx) => {
    const codBarras = obtenerCodigoBarras(prod);
    const idUnico = prod.id || codBarras || idx;
    const codigoMostrado = codBarras || 'S/C';
    const fotoUrl = prod.imagen_url || prod.foto || '';

    const pMayor = obtenerPrecioMayorista(prod);
    const cMayor = obtenerCantMayorista(prod);

    const mayoristaTag = pMayor > 0 ? `<p class="text-emerald-600 font-semibold text-[11px]">Mayor (x${cMayor}+): $${pMayor}</p>` : '';
    const imagenTag = fotoUrl 
      ? `<img src="${fotoUrl}" alt="${prod.nombre}" class="w-full h-24 object-contain rounded-md bg-white p-1">`
      : `<div class="w-full h-24 bg-slate-200 rounded-md flex items-center justify-center text-slate-400 text-2xl">📦</div>`;

    const btnEditarHtml = esAdmin 
      ? `<button data-editid="${idUnico}" class="btn-edit-prod absolute top-1 right-1 bg-white/80 hover:bg-white text-slate-700 p-1 rounded-full shadow text-xs">✏️</button>` 
      : '';

    htmlContent += `
      <div class="relative bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        ${btnEditarHtml}
        <div>
          ${imagenTag}
          <p class="font-semibold text-slate-800 text-xs mt-2 line-clamp-2 h-8" title="${prod.nombre}">${prod.nombre}</p>
          <div class="text-[11px] text-slate-500 mt-1 space-y-0.5">
            <p>Cód: <span class="font-medium text-slate-700">${codigoMostrado}</span></p>
            <p>Stock: <span class="font-medium text-slate-700">${prod.stock || 0}</span></p>
            <p class="text-indigo-600 font-bold text-sm">Min: $${prod.precio}</p>
            ${mayoristaTag}
          </div>
        </div>
        
        <div class="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1">
          <input type="number" id="qty_input_${idUnico}" value="1" min="1" class="w-12 px-1 py-1 text-center border rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <button data-addid="${idUnico}" class="btn-add-cart flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1 rounded text-xs font-medium text-center">Agregar</button>
        </div>
      </div>
    `;
  });

  contenedor.innerHTML = htmlContent;

  contenedor.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', (e) => agregarAlCarrito(e.target.dataset.addid));
  });

  contenedor.querySelectorAll('.btn-edit-prod').forEach(btn => {
    btn.addEventListener('click', (e) => abrirModalEditarProducto(e.target.dataset.editid));
  });
}

export function filtrarProductosDebounced() {
  clearTimeout(timerBusqueda);
  timerBusqueda = setTimeout(filtrarProductos, 120);
}

export function filtrarProductos() {
  const texto = document.getElementById('buscador').value.trim().toLowerCase();
  if (!texto) {
    mostrarProductos(todosLosProductos.slice(0, 40));
    return;
  }

  const palabrasClave = texto.split(/\s+/).filter(p => p.length > 0);
  const filtrados = todosLosProductos.filter(p => {
    const nombreProd = (p.nombre || '').toLowerCase();
    const codProd = String(obtenerCodigoBarras(p)).toLowerCase();
    const textoCompleto = `${nombreProd} ${codProd}`;
    return palabrasClave.every(palabra => textoCompleto.includes(palabra));
  }).slice(0, 40);

  mostrarProductos(filtrados);
}

export function abrirModalProducto() {
  document.getElementById('modalProductoTitulo').textContent = 'Agregar Nuevo Producto 📦';
  document.getElementById('btnEliminarProductoModal').classList.add('hidden');
  document.getElementById('editProductoId').value = '';
  document.getElementById('nuevoCodigo').value = '';
  document.getElementById('nuevoNombre').value = '';
  document.getElementById('nuevoStock').value = '0';
  document.getElementById('nuevoCosto').value = '';
  document.getElementById('nuevoVenta').value = '';
  document.getElementById('nuevoMayorista').value = '';
  document.getElementById('nuevoCantMayor').value = '6';
  document.getElementById('nuevoUnidadesBulto').value = '';
  document.getElementById('inputFotoCamara').value = '';
  fotoBase64Actual = '';
  
  document.getElementById('previewFoto').classList.add('hidden');
  document.getElementById('previewFoto').src = '';
  document.getElementById('placeholderFoto').classList.remove('hidden');
  document.getElementById('modalProducto').classList.remove('hidden');
}

export function abrirModalEditarProducto(id) {
  const prod = todosLosProductos.find(p => String(p.id) === String(id) || String(obtenerCodigoBarras(p)) === String(id));
  if (!prod) return;

  document.getElementById('modalProductoTitulo').textContent = 'Editar Producto ✏️';
  document.getElementById('btnEliminarProductoModal').classList.remove('hidden');
  document.getElementById('editProductoId').value = prod.id;
  document.getElementById('nuevoCodigo').value = obtenerCodigoBarras(prod);
  document.getElementById('nuevoNombre').value = prod.nombre || '';
  document.getElementById('nuevoStock').value = prod.stock || 0;
  document.getElementById('nuevoCosto').value = prod["Precio Costo"] || '';
  document.getElementById('nuevoVenta').value = prod.precio || '';
  document.getElementById('nuevoMayorista').value = obtenerPrecioMayorista(prod) || '';
  document.getElementById('nuevoCantMayor').value = obtenerCantMayorista(prod);
  document.getElementById('nuevoUnidadesBulto').value = obtenerUnidadesPorBulto(prod) || '';
  
  fotoBase64Actual = prod.imagen_url || prod.foto || '';

  const imgPreview = document.getElementById('previewFoto');
  if (fotoBase64Actual) {
    imgPreview.src = fotoBase64Actual;
    imgPreview.classList.remove('hidden');
    document.getElementById('placeholderFoto').classList.add('hidden');
  } else {
    imgPreview.classList.add('hidden');
    imgPreview.src = '';
    document.getElementById('placeholderFoto').classList.remove('hidden');
  }

  document.getElementById('modalProducto').classList.remove('hidden');
}

export function cerrarModalProducto() { document.getElementById('modalProducto').classList.add('hidden'); }

export async function guardarProducto() {
  const editId = document.getElementById('editProductoId').value;
  const codigo = document.getElementById('nuevoCodigo').value.trim();
  const nombre = document.getElementById('nuevoNombre').value.trim();
  const stock = parseInt(document.getElementById('nuevoStock').value) || 0;
  const costo = parseFloat(document.getElementById('nuevoCosto').value) || 0;
  const venta = parseFloat(document.getElementById('nuevoVenta').value) || 0;
  const pMayor = parseFloat(document.getElementById('nuevoMayorista').value) || null;
  const cMayor = parseInt(document.getElementById('nuevoCantMayor').value) || 6;
  const uBulto = parseInt(document.getElementById('nuevoUnidadesBulto').value) || 0;

  if (!nombre || !venta) {
    alert("El nombre y el precio de venta son obligatorios.");
    return;
  }

  const datosProducto = {
    codigo_barras: codigo !== "" ? codigo : null,
    nombre, stock, "Precio Costo": costo,
    precio: venta, precio_mayorista: pMayor,
    cantidad_mayorista: cMayor, unidades_por_bulto: uBulto,
    imagen_url: fotoBase64Actual, activo: true
  };

  let error = editId
    ? (await _supabase.from('productos').update(datosProducto).eq('id', editId)).error
    : (await _supabase.from('productos').insert([datosProducto])).error;

  if (error) {
    alert("Error al guardar: " + error.message);
  } else {
    alert("¡Producto guardado con éxito!");
    cerrarModalProducto();
    await cargarProductos();
  }
}

export function capturarFotoCamara(event) {
  const archivo = event.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxDim = 600;
      let width = img.width, height = img.height;

      if (width > height ? width > maxDim : height > maxDim) {
        if (width > height) { height *= maxDim / width; width = maxDim; }
        else { width *= maxDim / height; height = maxDim; }
      }

      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      fotoBase64Actual = canvas.toDataURL('image/jpeg', 0.7);
      
      const imgPreview = document.getElementById('previewFoto');
      imgPreview.src = fotoBase64Actual;
      imgPreview.classList.remove('hidden');
      document.getElementById('placeholderFoto').classList.add('hidden');
    };
    img.src = e.target.result;
  };
  lector.readAsDataURL(archivo);
}