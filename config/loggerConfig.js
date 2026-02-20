require('dotenv').config()

const fs = require('fs')
const path = require('path')
const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const {maskSensitiveData} = require('../helpers/maskSensitiveData')

const logDir = process.env.LOG_DIR || "logs";

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Winston log format (UTC based)
 */
const logFormat = winston.format.printf(
    ({ timestamp, level, message, stack, ...meta }) => {
        return JSON.stringify({
            timestamp,
            level,
            message: stack || message,
            ...maskSensitiveData(meta),
        });
    }
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
        winston.format.timestamp({format: () => new Date().toISOString()}), // ✅ UTC
        winston.format.errors({stack: true}),
        logFormat
    ),
    transports: [
        new DailyRotateFile({
            filename: path.join(logDir, "error-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            level: "error",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d",
        }),
        new DailyRotateFile({
            filename: path.join(logDir, "combined-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "30d",
        }),
    ],
});

/**
 * Console logging for development
 */
if (process.env.ENVIRONMENT === "development") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        })
    );
}

module.exports = {logger}