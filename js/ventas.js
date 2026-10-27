import { carrito, vaciarCarrito } from './carrito.js';
import { usuarioActualEmail, obtenerAtendidoPor } from './auth.js';
import { _supabase } from './supabaseClient.js';

let modoImpresionActual = 'bluetooth';

export function iniciarProcesoCobro(modo) {
  if (carrito.length === 0) { alert('El carrito está vacío'); return; }
  modoImpresionActual = modo;
  document.getElementById('nombreClienteInput').value = '';
  document.getElementById('modalClienteCobro').classList.remove('hidden');
}

export async function confirmarCobroVenta(nombreOmitido) {
  document.getElementById('modalClienteCobro').classList.add('hidden');
  let clienteNombre = nombreOmitido || document.getElementById('nombreClienteInput').value.trim() || 'Consumidor Final';
  await cobrarVentaFinal(clienteNombre);
}

async function cobrarVentaFinal(clienteNombre) {
  let total = 0;
  const detallesJson = carrito.map(i => {
    let p = (i.precioPersonalizado !== null && !isNaN(i.precioPersonalizado)) ? i.precioPersonalizado : (i.precioMayorista > 0 && i.cantidad >= i.cantMayorista ? i.precioMayorista : i.precioMinorista);
    total += p * i.cantidad;
    return { idUnico: i.idUnico, nombre: i.nombre, precio: p, cantidad: i.cantidad, unidadesBulto: i.unidadesBulto || 0 };
  });

  const fechaObj = new Date();
  const fechaStr = fechaObj.toISOString().split('T')[0];
  const horaStr = fechaObj.toTimeString().substring(0, 5);

  if (navigator.onLine) {
    try {
      const { data: ventaData, error: ventaError } = await _supabase.from('ventas').insert([{ total, cliente: clienteNombre, fecha: fechaStr, hora: horaStr, detalles: detallesJson }]).select();
      if (ventaError) throw ventaError;
      alert('¡Venta registrada con éxito!');
      
      if (modoImpresionActual === 'bluetooth') {
        imprimirTicketBluetooth(detallesJson, total, `${fechaStr} ${horaStr}`, `Ticket #${ventaData[0].id}`, clienteNombre);
      } else {
        imprimirTicketNavegador(detallesJson, total, `${fechaStr} ${horaStr}`, `Ticket #${ventaData[0].id}`, clienteNombre);
      }
    } catch (err) {
      alert('Error en Supabase, se guardará localmente.');
      guardarVentaOffline({ total, cliente: clienteNombre, detalles: detallesJson, fecha_str: fechaStr, hora_str: horaStr });
      imprimirTicketNavegador(detallesJson, total, `${fechaStr} ${horaStr}`, 'Ticket (Local)', clienteNombre);
    }
  } else {
    guardarVentaOffline({ total, cliente: clienteNombre, detalles: detallesJson, fecha_str: fechaStr, hora_str: horaStr });
    alert('⚡ Venta guardada localmente.');
    imprimirTicketNavegador(detallesJson, total, `${fechaStr} ${horaStr}`, 'Ticket (Offline)', clienteNombre);
  }

  vaciarCarrito();
}

function guardarVentaOffline(venta) {
  let pendientes = JSON.parse(localStorage.getItem('ventas_pendientes') || '[]');
  pendientes.push(venta);
  localStorage.setItem('ventas_pendientes', JSON.stringify(pendientes));
}

async function imprimirTicketBluetooth(items, total, fechaStr, tituloTicket, clienteNombre) {
  if (!navigator.bluetooth) {
    imprimirTicketNavegador(items, total, fechaStr, tituloTicket, clienteNombre);
    return;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
    });

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let targetCharacteristic = null;

    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const characteristic of characteristics) {
        if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
          targetCharacteristic = characteristic;
          break;
        }
      }
      if (targetCharacteristic) break;
    }

    if (!targetCharacteristic) throw new Error("No se encontró impresora.");

    const encoder = new TextEncoder();
    let comandos = [0x1B, 0x40, 0x1B, 0x61, 0x01]; // Reset y Centrar

    comandos.push(...encoder.encode("GO! - PUNTO DE VENTA\n--------------------------------\n"));
    comandos.push(...encoder.encode(`${tituloTicket}\nFecha: ${fechaStr}\nAtendido por: ${obtenerAtendidoPor(usuarioActualEmail)}\nCliente: ${clienteNombre}\n--------------------------------\n`));
    
    comandos.push(0x1B, 0x61, 0x00); // Izquierda
    items.forEach(item => {
      let subtotal = (item.precio * item.cantidad).toFixed(2);
      comandos.push(...encoder.encode(`${item.cantidad}x ${item.nombre}\n  -> $${subtotal}\n`));
    });

    comandos.push(...encoder.encode("--------------------------------\n"));
    comandos.push(0x1B, 0x61, 0x01, 0x1D, 0x21, 0x11);
    comandos.push(...encoder.encode(`TOTAL: $${parseFloat(total).toFixed(2)}\n`));
    comandos.push(0x1D, 0x21, 0x00);
    comandos.push(...encoder.encode("--------------------------------\n¡GRACIAS POR SU VISITA!\n\n\n"), 0x1D, 0x56, 0x42, 0x00);

    const buffer = new Uint8Array(comandos);
    const chunkSize = 512;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      await targetCharacteristic.writeValue(buffer.slice(i, i + chunkSize));
    }

    device.gatt.disconnect();
  } catch (error) {
    imprimirTicketNavegador(items, total, fechaStr, tituloTicket, clienteNombre);
  }
}

function imprimirTicketNavegador(items, total, fechaStr, tituloTicket, clienteNombre) {
  document.getElementById('ticketFecha').textContent = fechaStr;
  document.getElementById('ticketIdVenta').textContent = tituloTicket;
  document.getElementById('ticketAtendidoPor').textContent = obtenerAtendidoPor(usuarioActualEmail);
  document.getElementById('ticketCliente').textContent = clienteNombre;
  
  const ticketItemsContainer = document.getElementById('ticketItems');
  ticketItemsContainer.innerHTML = '';

  items.forEach(item => {
    let pUnit = parseFloat(item.precio || 0);
    let importe = pUnit * (item.cantidad || 1);
    ticketItemsContainer.innerHTML += `
      <div class="flex justify-between items-start">
        <span class="w-[18%] text-left font-bold">${item.cantidad} und.</span>
        <span class="w-[38%] text-left px-0.5 break-words">${item.nombre}</span>
        <span class="w-[20%] text-right">$${pUnit.toFixed(2)}</span>
        <span class="w-[24%] text-right font-bold">$${importe.toFixed(2)}</span>
      </div>
    `;
  });
  document.getElementById('ticketTotal').textContent = '$' + parseFloat(total).toFixed(2);

  const win = window.open('', '_blank', 'width=380,height=600');
  if (win) {
    win.document.write(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-white p-2">${document.getElementById('ticketImpresion').innerHTML}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}</script></body></html>`);
    win.document.close();
  }
}