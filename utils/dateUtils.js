// utils/dateUtils.js

function normalizarTitulo(t) {
  return (t || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDataEntrega(dataEntrega) {
  if (!dataEntrega) return null;

  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(dataEntrega));
  if (iso) {
    const d = new Date(dataEntrega);
    return isNaN(d.getTime()) ? null : d;
  }

  const brt = String(dataEntrega).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ]+(\d{1,2}):(\d{2})/);
  if (brt) {
    return new Date(+brt[3], +brt[2] - 1, +brt[1], +brt[4], +brt[5], 0, 0);
  }

  return null;
}

module.exports = { normalizarTitulo, parseDataEntrega };
