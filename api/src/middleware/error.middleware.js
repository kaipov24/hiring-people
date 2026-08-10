export const notFoundHandler = (req, _res, next) => {
  const error = new Error(`Страница не найдена: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

export const errorHandler = (error, _req, res, _next) => {
  const isExpiredJwt = error.name === "TokenExpiredError";
  const status = error.status ?? (isExpiredJwt ? 401 : 500);
  const message = isExpiredJwt ? "Сессия истекла. Войдите снова." : error.message;

  res.status(status).json({
    error: {
      message: status === 500 ? "Внутренняя ошибка сервера" : message,
      status,
      details: error.details
    }
  });
};
