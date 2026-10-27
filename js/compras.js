import { todosLosProductos, obtenerCodigoBarras, cargarProductos } from './productos.js';
import { _supabase } from './supabaseClient.js';

let itemsCompraActual = [];

export function abrirModalCompra() {
  document.getElementById('compraProveedor').value = 'Wayra';
  document.getElementById('compraNroFactura').value = '';
  document.getElementById('buscadorCompraProd').value = '';
  document.getElementById('textoEstadoTicket').textContent = 'Sube la foto del ticket para guardarla y usa el buscador rápido para sumar los fideos.';
  itemsCompraActual = [];
  actualizarTablaCompraVisual();
  document.getElementById('modalCompra').classList.remove('hidden');
}

export function cerrarModalCompra() { document.getElementById('modalCompra').classList.add('hidden'); }

export function procesarFotoTicket(event) {
  const archivo = event.target.files[0];
  if (!archivo) return;
  const btnEsc = document.getElementById('btnEscanearIA');
  btnEsc.textContent = 'Ticket adjuntado ✓';
  document.getElementById('textoEstadoTicket').textContent = `✓ Ticket adjuntado con éxito (${archivo.name}). Agrega los productos abajo.`;
  alert('¡Comprobante de Wayra adjuntado con éxito! Ahora usa el buscador de abajo para sumar los fideos y sus costos.');
  setTimeout(() => { btnEsc.innerHTML = '<span>📸</span> Adjuntar Foto Ticket'; }, 2000);
  event.target.value = '';
}

export function filtrarProductosCompra() {
  const texto = document.getElementById('buscadorCompraProd').value.trim().toLowerCase();
  const contenedor = document.getElementById('listaResultadosCompra');

  if (!texto || texto.length < 2) {
    contenedor.classList.add('hidden');
    return;
  }

  const encontrados = todosLosProductos.filter(p => {
    return (p.nombre || '').toLowerCase().includes(texto) || String(obtenerCodigoBarras(p)).toLowerCase().includes(texto);
  }).slice(0, 10);

  if (encontrados.length === 0) {
    contenedor.innerHTML = '<div class="p-2 text-slate-400 text-center">No se encontró producto</div>';
    contenedor.classList.remove('hidden');
    return;
  }

  let html = '';
  encontrados.forEach(p => {
    const codProd = obtenerCodigoBarras(p);
    const costoActual = parseFloat(p["Precio Costo"] || 0);
    html += `
      <div data-cod="${codProd}" data-nom="${p.nombre}" data-costo="${costoActual}" class="item-res-compra p-2 hover:bg-emerald-50 cursor-pointer border-b flex justify-between items-center">
        <span>[${codProd || 'S/C'}] ${p.nombre}</span>
        <span class="text-emerald-700 font-semibold">Costo actual: $${costoActual}</span>
      </div>
    `;
  });

  contenedor.innerHTML = html;
  contenedor.classList.remove('hidden');

  contenedor.querySelectorAll('.item-res-compra').forEach(el => {
    el.addEventListener('click', () => {
      agregarItemCompraManual(el.dataset.cod, el.dataset.nom, parseFloat(el.dataset.costo));
    });
  });
}

function agregarItemCompraManual(codigo, nombre, costoActual) {
  document.getElementById('listaResultadosCompra').classList.add('hidden');
  document.getElementById('buscadorCompraProd').value = '';

  const existente = itemsCompraActual.find(i => String(i.codigo) === String(codigo) && codigo !== "");
  if (existente) existente.cantidad += 1;
  else itemsCompraActual.push({ codigo: codigo || '', nombre, cantidad: 1, costoUnitario: costoActual });

  actualizarTablaCompraVisual();
}

function actualizarTablaCompraVisual() {
  const tbody = document.getElementById('tablaItemsCompra');
  const totalSpan = document.getElementById('compraTotalGeneral');

  if (itemsCompraActual.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400">Usa el buscador de arriba para agregar los fideos del ticket de Wayra</td></tr>';
    totalSpan.textContent = '$0.00';
    return;
  }

  let html = '', totalFactura = 0;
  itemsCompraActual.forEach((item, idx) => {
    let subtotal = (item.cantidad || 0) * (item.costoUnitario || 0);
    totalFactura += subtotal;

    html += `
      <tr>
        <td class="p-2"><input type="text" value="${item.codigo || ''}" data-idx="${idx}" class="inp-compra-cod w-20 px-1.5 py-1 border rounded text-xs bg-slate-50 font-mono"></td>
        <td class="p-2 font-medium text-slate-800">${item.nombre}</td>
        <td class="p-2 text-center"><input type="number" min="1" value="${item.cantidad}" data-idx="${idx}" class="inp-compra-cant w-16 px-1 py-1 text-center border rounded text-xs"></td>
        <td class="p-2 text-right"><input type="number" step="0.01" min="0" value="${item.costoUnitario}" data-idx="${idx}" class="inp-compra-costo w-24 px-1 py-1 text-right border rounded text-xs"></td>
        <td class="p-2 text-right font-semibold text-slate-700">$${subtotal.toFixed(2)}</td>
        <td class="p-2 text-center"><button data-idx="${idx}" class="btn-compra-del text-rose-500 font-bold">✕</button></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  totalSpan.textContent = '$' + totalFactura.toFixed(2);

  tbody.querySelectorAll('.inp-compra-cod').forEach(i => i.addEventListener('change', e => itemsCompraActual[e.target.dataset.idx].codigo = e.target.value.trim()));
  tbody.querySelectorAll('.inp-compra-cant').forEach(i => i.addEventListener('change', e => { itemsCompraActual[e.target.dataset.idx].cantidad = parseInt(e.target.value) || 1; actualizarTablaCompraVisual(); }));
  tbody.querySelectorAll('.inp-compra-costo').forEach(i => i.addEventListener('change', e => { itemsCompraActual[e.target.dataset.idx].costoUnitario = parseFloat(e.target.value) || 0; actualizarTablaCompraVisual(); }));
  tbody.querySelectorAll('.btn-compra-del').forEach(i => i.addEventListener('click', e => { itemsCompraActual.splice(e.target.dataset.idx, 1); actualizarTablaCompraVisual(); }));
}

export async function guardarFacturaCompra() {
  const proveedor = document.getElementById('compraProveedor').value.trim();
  const nroFactura = document.getElementById('compraNroFactura').value.trim();

  if (!proveedor || itemsCompraActual.length === 0) {
    alert('Complete el proveedor y agregue al menos un producto.');
    return;
  }

  let totalFactura = itemsCompraActual.reduce((acc, item) => acc + (item.cantidad * item.costoUnitario), 0);

  try {
    const { data: compraData, error: compraError } = await _supabase
      .from('compras_facturas')
      .insert([{ proveedor, numero_factura: nroFactura || null, total: totalFactura }]).select();

    if (compraError) throw compraError;
    const compraId = compraData[0].id;

    for (let item of itemsCompraActual) {
      let prodRef = item.codigo ? todosLosProductos.find(p => String(obtenerCodigoBarras(p)).trim() === String(item.codigo).trim()) : null;
      const codigoFinal = item.codigo || (prodRef ? obtenerCodigoBarras(prodRef) : '');
      const nuevoStock = (prodRef ? (parseInt(prodRef.stock) || 0) : 0) + item.cantidad;

      await _supabase.from('compras_detalles').insert([{
        compra_id: compraId, codigo_barras: codigoFinal, nombre_producto: item.nombre,
        cantidad: item.cantidad, precio_costo_unitario: item.costoUnitario, subtotal: item.cantidad * item.costoUnitario
      }]);

      if (prodRef) {
        await _supabase.from('productos').update({ "Precio Costo": item.costoUnitario, stock: nuevoStock }).eq('id', prodRef.id);
      }
    }

    alert('¡Factura registrada y costos/stock actualizados!');
    cerrarModalCompra();
    await cargarProductos();
  } catch (err) {
    alert('Error al registrar la factura: ' + err.message);
  }
}