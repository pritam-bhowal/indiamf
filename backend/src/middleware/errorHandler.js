function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
