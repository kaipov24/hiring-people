export const notFoundHandler = (req, _res, next) => {
  const error = new Error(`Страница не найдена: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

export const errorHandler = (error, _req, res, _next) => {
  const status = error.status ?? 500;

  res.status(status).json({
    error: {
      message: status === 500 ? "Внутренняя ошибка сервера" : error.message,
      status,
      details: error.details
    }
  });
};
