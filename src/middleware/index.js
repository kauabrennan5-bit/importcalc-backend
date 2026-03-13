const rateLimit = require('express-rate-limit');
const cors      = require('cors');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin não permitida: ${origin}`));
    }
  },
  methods:        ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
};

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 30,
  message:  { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const shippingLimiter = rateLimit({
  windowMs: 60000,
  max:      15,
  message:  { error: 'Limite de cálculos atingido. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  if (err.message?.includes('Origin não permitida')) {
    return res.status(403).json({ error: 'Acesso não permitido' });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message,
  });
}

module.exports = { corsOptions, cors, generalLimiter, shippingLimiter, errorHandler };
