function csvCell(value) {
  if (value === null || value === undefined) return '""';
  let s;
  if (typeof value === 'number' && Number.isFinite(value)) {
    s = String(value);
  } else {
    s = String(value);
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    s = s.replace(/\r\n|[\r\n]/g, ' ');
    s = s.slice(0, 32000);
    if (/^[\s\u00A0\u3000]*[=+\-@\t\r\uFF1D\uFF0B\uFF0D\uFF20]/.test(s)) s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

function csvRow(values) {
  return values.map(csvCell).join(',');
}

function toCsv(header, rows) {
  return '\uFEFF' + [header, ...rows].map(csvRow).join('\r\n') + '\r\n';
}

module.exports = { csvCell, csvRow, toCsv };
