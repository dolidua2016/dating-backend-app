const morgan = require('morgan')
const {logger} = require('../config/loggerConfig')

/**
 * Add custom tokens
 */
morgan.token("userId", (req) => req.headers.userId || "anonymous");
morgan.token("ip", (req) => req.socket.remoteAddress || req.headers["x-forwarded-for"] || '*** unknown ***' );

/**
 * Morgan → Winston
 */
module.exports.morganMiddleware = morgan(
    (tokens, req, res) => {
        return JSON.stringify({
            timestamp: new Date().toISOString(), // UTC
            method: tokens.method(req, res),
            url: tokens.url(req, res),
            status: Number(tokens.status(req, res)),
            contentLength: tokens.res(req, res, "content-length"),
            responseTime: `${tokens["response-time"](req, res)} ms`,
            ip: tokens.ip(req),
            userId: tokens.userId(req),
            userAgent: req.headers["user-agent"],
        });
    },
    {
        stream: {
            write: (message) => {
                logger.info("HTTP Request", JSON.parse(message));
            },
        },
    }
);
