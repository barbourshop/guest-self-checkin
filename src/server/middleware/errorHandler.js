const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal server error",
      detail: err.message
    });
  };
  
  module.exports = errorHandler;