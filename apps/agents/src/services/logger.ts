import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

const pinoConfig: Parameters<typeof pino>[0] = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
};

if (isDev) {
  pinoConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(pinoConfig);
