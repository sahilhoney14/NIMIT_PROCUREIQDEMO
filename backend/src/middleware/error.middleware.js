const { log } = require("../utils/logger");

function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || err.status || 500;
    
    // Normalize Multer and validation errors to 400 Bad Request
    if (err.name === "MulterError" || err.message?.includes("permitted") || err.message?.includes("File type")) {
        statusCode = 400;
    }

    const message = err.message || "Internal Server Error";

    log(`[ERROR] ${req.method} ${req.originalUrl} - ${message}`);
    if (statusCode >= 500 && process.env.NODE_ENV !== "production") {
        console.error(err.stack);
    }

    return res.status(statusCode).json({
        success: false,
        message,
        ...(statusCode >= 500 && process.env.NODE_ENV !== "production" ? { stack: err.stack } : {})
    });
}

module.exports = {
    errorHandler
};
