require('dotenv').config();

const express = require('express');
const auth    = require('./auth/hubbuy');
const cache   = require('./services/cache');
const {
  cors, corsOptions,
  generalLimiter, shippingLimiter,
  errorHandler,
} = require('./middleware');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors(corsOptions));
app.use(express.json());
app.use(generalLimiter);

app.use('/api/countries',     require('./routes/countries'));
app.use('/api/product-types', require('./routes/productTypes'));
app.use('/api/shipping',      shippingLimiter, require('./routes/shipping'));

app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    env:       process.env.NODE_ENV || 'development',
    cache:     cache.stats(),
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

app.use(errorHandler);

async function start() {
  try {
    console.log('[Server] Iniciando...');
    await auth.login();
    console.log('[Server] Autenticado na HubbuyCN ✓');

    app.listen(PORT, () => {
      console.log(`[Server] Rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Falha na inicialização:', err.message);
    process.exit(1);
  }
}

start();
