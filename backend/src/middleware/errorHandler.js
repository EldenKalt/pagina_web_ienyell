module.exports = (err, req, res, next) => {
  console.error(err);
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: isProd && status >= 500 ? 'Error interno del servidor' : (err.message || 'Error interno del servidor')
  });
};
