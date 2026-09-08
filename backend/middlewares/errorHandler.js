const errorHandler = (err, req, res, _next) => {
  // Log the error message (except in test environment to keep logs clean and fast)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error Handler] ${err.name || 'Error'}: ${err.message}`);
    
    // Conditionally log stack trace in non-production environments
    if (process.env.NODE_ENV !== 'production' && err.stack) {
      console.error(err.stack);
    }
  }

  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let validationErrors = err.errors || undefined;

  // Specific mapping for validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    validationErrors = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
  } else if (err.name === 'ValidationError') {
    // Mongoose schema validation error
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'CastError' || err.name === 'BSONError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid ID provided';
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 400;
    errorCode = 'DUPLICATE_KEY_ERROR';
    message = 'Duplicate key error: value already exists';
  }

  const responsePayload = {
    success: false,
    error: {
      message,
      code: errorCode,
      status: statusCode,
      ...(validationErrors && { errors: validationErrors }),
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  };

  res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;
