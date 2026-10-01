function parseBulkIds(body) {
  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    return { error: "ids debe ser un arreglo no vacío" };
  }

  const ids = [...new Set(body.ids.map((value) => Number(value)))];
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: "ids debe contener únicamente enteros positivos" };
  }

  return { ids };
}

module.exports = { parseBulkIds };
