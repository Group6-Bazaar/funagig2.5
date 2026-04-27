import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors to a simple object { field: 'Message' }
    const formattedErrors = errors.array().reduce((acc, err) => {
      acc[err.path] = err.msg;
      return acc;
    }, {});
    
    return res.status(400).json({ errors: formattedErrors });
  }
  next();
};
