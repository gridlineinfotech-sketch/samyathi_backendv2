import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp, stack, context }) => {
        return `${timestamp} [${level.toUpperCase()}]${context ? ` [${context}]` : ''}: ${message}${stack ? `\n${stack}` : ''}`;
      }),
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize({ all: true }), logFormat),
      }),
    ];

    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat,
        }),
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: logFormat,
        }),
      );
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exitOnError: false,
    });
  }

  log(message: string, context?: string) { this.logger.info(message, { context }); }
  error(message: string, trace?: string, context?: string) { this.logger.error(message, { context, stack: trace }); }
  warn(message: string, context?: string) { this.logger.warn(message, { context }); }
  debug(message: string, context?: string) { this.logger.debug(message, { context }); }
  verbose(message: string, context?: string) { this.logger.verbose(message, { context }); }
  setLogLevels(levels: LogLevel[]) { this.logger.levels = winston.config.npm.levels; }
}
