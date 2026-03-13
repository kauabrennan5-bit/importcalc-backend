const express           = require('express');
const router            = express.Router();
const client            = require('../services/hubbuyClient');
const cache             = require('../services/cache');
const { calcTotalCost } = require('../utils/calculations');

router.post('/', async (req, res) => {
  const {
    countryId, productTypeId,
    weight, length, width, height,
    productValue = 0, usdToBrl,
  } = req.body;

  const errors = [];
  if (!countryId)             errors.push('countryId obrigatório');
  if (!productTypeId)         errors.push('productTypeId obrigatório');
  if (!weight || weight <= 0) errors.push('weight inválido (em gramas)');
  if (!length || length <= 0) errors.push('length inválido (em cm)');
  if (!width  || width  <= 0) errors.push('width inválido (em cm)');
  if (!height || height <= 0) errors.push('height inválido (em cm)');

  if (errors.length) {
    return res.status(400).json({ error: 'Dados inválidos', details: errors });
  }

  const cacheKey = cache.shippingKey({ countryId, productTypeId, weight, length, width, height });
  const cached   = cache.get(cacheKey);
  const exchange = usdToBrl || parseFloat(process.env.USD_TO_BRL) || 5.0;

  if (cached) {
    const routes = cached.map(r =>
      calcTotalCost(r, productValue, weight, length, width, height, exchange)
    );
    return res.json({
      source: 'cache',
      meta:   buildMeta(weight, length, width, height, productValue, exchange),
      routes: sortRoutes(routes),
    });
  }

  try {
    console.log(`[Shipping] ${weight}g ${length}x${width}x${height}cm`);

    const response = await client.post('/api/Delivery/calculateDeliveryFee', {
      countryId:     Number(countryId),
      productTypeId: Number(productTypeId),
      weight:        Number(weight),
      length:        Number(length),
      width:         Number(width),
      height:        Number(height),
    });

    const rawRoutes = extractRoutes(response.data);

    if (!rawRoutes.length) {
      return res.status(404).json({ error: 'Nenhuma rota disponível para esses parâmetros' });
    }

    cache.set(cacheKey, rawRoutes, cache.TTL.shipping);

    const routes = rawRoutes.map(r =>
      calcTotalCost(r, productValue, weight, length, width, height, exchange)
    );

    res.json({
      source: 'api',
      meta:   buildMeta(weight, length, width, height, productValue, exchange),
      routes: sortRoutes(routes),
    });

  } catch (err) {
    console.error('[Shipping] Erro:', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

function extractRoutes(data) {
  const list = data?.data || data?.result || data?.list || data?.routes || data?.items || [];
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    id:        item.id || item.route_id || item.lineId,
    name:      item.name || item.lineName || item.line_name || item.shippingName || item.channelName,
    price:     parseFloat(item.price || item.totalPrice || item.fee || 0),
    prazo_min: parseMin(item),
    prazo_max: parseMax(item),
  })).filter(r => r.name && r.price > 0);
}

function parseMin(item) {
  const raw  = item.deliveryTime || item.delivery_time || item.aging || item.days​​​​​​​​​​​​​​​​
