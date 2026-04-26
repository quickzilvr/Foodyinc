// Utilidades compartidas del cliente - YFoods / Foody

const API_BASE = '';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('foody_token');
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-auth-token': token } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

function formatCLP(amount) {
  return `$${Number(amount).toLocaleString('es-CL')} CLP`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

console.log('Foody app ready');
