import chalk from 'chalk';
import { createLogger, format, transports } from 'winston';

const formatForLogs = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.splat(),
  format.simple(),
  format.printf(info => [
    info.timestamp,
    `[${info.level}]`,
    info.message,
  ].join('\t')),
);

const formatForConsole = format.combine(
  format.splat(),
  format.simple(),
  format.printf((info) => {
    switch (info.level) {
      case 'error':
        return chalk.red(`ERROR: ${info.message}`);
      case 'warn':
        return chalk.yellow(`WARNING: ${info.message}`);
      case 'debug':
        return chalk.blue(info.message);
      case 'verbose':
        return chalk.cyan(info.message);
      case 'silly':
        return chalk.magenta(info.message);
      default:
        return info.message;
    }
  }),
);

export default createLogger({
  level: 'info',
  format: formatForLogs,
  transports: [
    new transports.File({ filename: 'debug.log', level: 'debug' }),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.Console({ format: formatForConsole }),
  ],
});
