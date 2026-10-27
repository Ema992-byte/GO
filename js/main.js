import { cargarProductos, filtrarProductosDebounced, abrirModalProducto, cerrarModalProducto, guardarProducto, capturarFotoCamara } from './productos.js';
import { cerrarSesion } from './auth.js';
import { abrirModalCompra, cerrarModalCompra, procesarFotoTicket, filtrarProductosCompra, guardarFacturaCompra } from './compras.js';
import { iniciarProcesoCobro, confirmarCobroVenta } from './ventas.js';
import { abrirScannerCamara, cerrarScannerCamara } from './scanner.js';

document.addEventListener('DOMContentLoaded', () => {
  // Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await cargarProductos();
  });

  // Buscador y Escáner
  document.getElementById('buscador').addEventListener('input', filtrarProductosDebounced);
  document.getElementById('btnAbrirScanner').addEventListener('click', abrirScannerCamara);
  document.getElementById('btnCerrarScanner').addEventListener('click', cerrarScannerCamara);

  // Venta y Cobro (Soporta Bluetooth y PDF/Web)
  const btnBt = document.querySelector('button[onclick*="bluetooth"]');
  if (btnBt) {
    btnBt.removeAttribute('onclick');
    btnBt.addEventListener('click', () => iniciarProcesoCobro('bluetooth'));
  }

  const btnPdf = document.querySelector('button[onclick*="pdf"]');
  if (btnPdf) {
    btnPdf.removeAttribute('onclick');
    btnPdf.addEventListener('click', () => iniciarProcesoCobro('pdf'));
  }

  document.getElementById('btnConfirmarCobro').addEventListener('click', () => confirmarCobroVenta());
  document.getElementById('btnOmitirClienteCobro').addEventListener('click', () => confirmarCobroVenta('Consumidor Final'));

  // Admin Módulos
  const menuAdminBtn = document.getElementById('btnMenuAdmin') || document.querySelector('button[onclick*="toggleMenuAdmin"]');
  if (menuAdminBtn) {
    menuAdminBtn.addEventListener('click', () => {
      document.getElementById('dropdownMenuAdmin').classList.toggle('hidden');
    });
  }

  document.getElementById('btnAdminNuevoProd')?.addEventListener('click', abrirModalProducto);
  document.getElementById('btnAdminRegCompra')?.addEventListener('click', abrirModalCompra);
  document.getElementById('btnSalir').addEventListener('click', cerrarSesion);

  // Modal Compras
  document.getElementById('btnCerrarModalCompra').addEventListener('click', cerrarModalCompra);
  document.getElementById('btnCancelarModalCompra').addEventListener('click', cerrarModalCompra);
  document.getElementById('btnEscanearIA').addEventListener('click', () => document.getElementById('inputFotoFacturaIA').click());
  document.getElementById('inputFotoFacturaIA').addEventListener('change', procesarFotoTicket);
  document.getElementById('buscadorCompraProd').addEventListener('input', filtrarProductosCompra);
  document.getElementById('btnGuardarFacturaCompra').addEventListener('click', guardarFacturaCompra);

  // Modal Producto CRUD
  document.getElementById('btnSelFotoProd').addEventListener('click', () => document.getElementById('inputFotoCamara').click());
  document.getElementById('inputFotoCamara').addEventListener('change', capturarFotoCamara);
  document.getElementById('btnGuardarProd').addEventListener('click', guardarProducto);
  document.getElementById('btnCancelarProd').addEventListener('click', cerrarModalProducto);
});