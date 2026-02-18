/**
 * Global error handling middleware.
 */
export function notFound(req, res, next) {
  res.status(404).json({ success: false, message: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
