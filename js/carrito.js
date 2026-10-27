import { todosLosProductos, obtenerCodigoBarras, obtenerPrecioMayorista, obtenerCantMayorista, obtenerUnidadesPorBulto } from './productos.js';
import { usuarioActualEmail } from './auth.js';

export let carrito = [];

export function agregarAlCarrito(idUnico) {
  const prodRef = todosLosProductos.find(p => String(p.id) === String(idUnico) || String(obtenerCodigoBarras(p)) === String(idUnico));
  if (!prodRef) return;

  const inputQty = document.getElementById(`qty_input_${idUnico}`);
  const cantidadAAgregar = parseInt(inputQty ? inputQty.value : 1) || 1;
  const itemExistente = carrito.find(item => item.idUnico === idUnico);
  
  if (itemExistente) {
    itemExistente.cantidad += cantidadAAgregar;
  } else {
    carrito.push({ 
      idUnico, nombre: prodRef.nombre, 
      precioMinorista: parseFloat(prodRef.precio) || 0,
      precioMayorista: obtenerPrecioMayorista(prodRef),
      cantMayorista: obtenerCantMayorista(prodRef),
      unidadesBulto: obtenerUnidadesPorBulto(prodRef),
      precioPersonalizado: null,
      cantidad: cantidadAAgregar 
    });
  }
  if (inputQty) inputQty.value = 1;
  actualizarCarritoVisual();
}

export function actualizarCarritoVisual() {
  const contenedor = document.getElementById('carritoList');
  const totalSpan = document.getElementById('totalVenta');

  if (carrito.length === 0) {
    contenedor.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">El carrito está vacío</p>';
    totalSpan.textContent = '$0.00';
    return;
  }

  contenedor.innerHTML = '';
  let total = 0;
  const esAdmin = (usuarioActualEmail || '').toLowerCase().includes('admi');

  carrito.forEach((item, index) => {
    let precioAplicado = item.precioMinorista;
    let esMayorista = false;

    if (item.precioPersonalizado !== null && !isNaN(item.precioPersonalizado)) {
      precioAplicado = item.precioPersonalizado;
    } else if (item.precioMayorista > 0 && item.cantidad >= item.cantMayorista) {
      precioAplicado = item.precioMayorista;
      esMayorista = true;
    }

    let subtotal = precioAplicado * item.cantidad;
    total += subtotal;

    const badgeMayorista = (esMayorista && item.precioPersonalizado === null)
      ? `<span class="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded ml-1">MAYORISTA</span>` : '';
    const badgePersonalizado = item.precioPersonalizado !== null 
      ? `<span class="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded ml-1">EDITADO</span>` : '';

    const campoPrecioHtml = esAdmin
      ? `<div class="flex items-center gap-0.5">
           <span class="text-xs text-slate-400">$</span>
           <input type="number" step="0.01" min="0" value="${precioAplicado}" data-idx="${index}" class="input-precio-item w-16 px-1 py-0.5 text-right font-semibold border border-amber-300 bg-amber-50 rounded text-xs text-amber-900 focus:ring-1 focus:ring-amber-500 focus:outline-none">
         </div>`
      : `<p class="text-xs text-slate-500">$${precioAplicado.toFixed(2)} c/u</p>`;

    contenedor.innerHTML += `
      <div class="flex justify-between items-center bg-white p-2.5 rounded border text-sm shadow-sm gap-2">
        <div class="flex-grow">
          <p class="font-medium text-slate-800">${item.nombre} ${badgeMayorista}${badgePersonalizado}</p>
          ${campoPrecioHtml}
        </div>
        
        <div class="flex items-center gap-1">
          <span class="text-xs text-slate-400">Cant:</span>
          <input type="number" min="1" value="${item.cantidad}" data-idx="${index}" class="input-cant-item w-14 px-1 py-1 text-center font-semibold border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none">
        </div>

        <div class="text-right min-w-[60px]">
          <span class="font-semibold text-slate-700 text-xs">$${subtotal.toFixed(2)}</span>
        </div>

        <button data-idx="${index}" class="btn-del-item text-rose-500 hover:text-rose-700 font-bold px-1 ml-1">✕</button>
      </div>
    `;
  });

  totalSpan.textContent = '$' + total.toFixed(2);

  contenedor.querySelectorAll('.input-precio-item').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const p = parseFloat(e.target.value);
      carrito[e.target.dataset.idx].precioPersonalizado = (!isNaN(p) && p >= 0) ? p : null;
      actualizarCarritoVisual();
    });
  });

  contenedor.querySelectorAll('.input-cant-item').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const cant = parseInt(e.target.value);
      if (isNaN(cant) || cant <= 0) carrito.splice(e.target.dataset.idx, 1);
      else carrito[e.target.dataset.idx].cantidad = cant;
      actualizarCarritoVisual();
    });
  });

  contenedor.querySelectorAll('.btn-del-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      carrito.splice(e.target.dataset.idx, 1);
      actualizarCarritoVisual();
    });
  });
}

export function vaciarCarrito() {
  carrito = [];
  actualizarCarritoVisual();
}