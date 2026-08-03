export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const error = new Error("Проверьте правильность заполнения формы");
    error.status = 400;
    error.details = result.error.flatten();
    next(error);
    return;
  }

  req.body = result.data;
  next();
};
