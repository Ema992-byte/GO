import { _supabase } from './supabaseClient.js';
import { cargarProductos } from './productos.js';

export let usuarioActualEmail = '';

export function obtenerAtendidoPor(email) {
  const emailLower = (email || '').toLowerCase();
  if (emailLower.includes('admi')) return 'E.J';
  if (emailLower.includes('vendedor1')) return 'Vendedor 1';
  if (emailLower.includes('vendedor2')) return 'Vendedor 2';
  let nombre = emailLower.split('@')[0];
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export function iniciarSesionExitosa(email, productosData) {
  usuarioActualEmail = email;
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('posSection').classList.remove('hidden');

  document.getElementById('cantProductos').textContent = `${productosData.length} productos`;

  const esAdmin = email.toLowerCase().includes('admi');
  if (esAdmin) {
    document.getElementById('usuarioRol').textContent = 'Perfil: Administrador (E.J)';
    document.getElementById('contenedorMenuAdmin').classList.remove('hidden');
  } else {
    document.getElementById('usuarioRol').textContent = `Perfil: ${obtenerAtendidoPor(email)}`;
    document.getElementById('contenedorMenuAdmin').classList.add('hidden');
  }
}

export function cerrarSesion() {
  _supabase.auth.signOut();
  document.getElementById('posSection').classList.add('hidden');
  document.getElementById('loginSection').classList.remove('hidden');
}