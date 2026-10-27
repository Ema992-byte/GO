import { todosLosProductos, obtenerCodigoBarras, filtrarProductos } from './productos.js';
import { agregarAlCarrito } from './carrito.js';

let scannerActivo = false;

export function abrirScannerCamara() {
  document.getElementById('modalScanner').classList.remove('hidden');
  scannerActivo = true;

  Quagga.init({
    inputStream: { name: "Live", type: "LiveStream", target: document.querySelector('#interactive'), constraints: { facingMode: "environment" } },
    decoder: { readers: ["ean_reader", "ean_8_reader", "upc_reader", "code_128_reader"] }
  }, function(err) {
    if (err) { alert('Error cámara: ' + err); cerrarScannerCamara(); return; }
    Quagga.start();
  });

  Quagga.onDetected(function(result) {
    if (!scannerActivo) return;
    const codigoLeido = String(result.codeResult.code).trim();
    const prod = todosLosProductos.find(p => String(obtenerCodigoBarras(p)).trim() === codigoLeido);

    if (prod) {
      agregarAlCarrito(prod.id || obtenerCodigoBarras(prod));
      cerrarScannerCamara();
      alert(`¡Producto agregado: ${prod.nombre}!`);
    } else {
      document.getElementById('buscador').value = codigoLeido;
      cerrarScannerCamara();
      filtrarProductos();
    }
  });
}

export function cerrarScannerCamara() {
  scannerActivo = false;
  try { Quagga.stop(); } catch(e){}
  document.getElementById('modalScanner').classList.add('hidden');
}