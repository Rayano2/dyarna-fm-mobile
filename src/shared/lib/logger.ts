type Level = 'debug' | 'info' | 'warn' | 'error';

function pickFn(level: Level) {
  if (level === 'error') return console.error;
  if (level === 'warn') return console.warn;
  return console.log;
}

function log(level: Level, msg: string, meta?: unknown) {
  if (!__DEV__) return;
  const fn = pickFn(level);
  if (meta === undefined) {
    fn(`[${level}] ${msg}`);
  } else {
    fn(`[${level}] ${msg}`, meta);
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
};
