const express = require('express');
const router  = express.Router();
const client  = require('../services/hubbuyClient');
const cache   = require('../services/cache');

router.get('/', async (req, res) => {
  const CACHE_KEY = 'product-types:all';

  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const response = await client.get('/api/Delivery/getProductTypeList');
    const types = response.data?.data || [];

    const formatted = types.map(t => ({
      id:       t.id,
      name:     t.pt_br_name || t.en_us_name || t.name,
      nameEn:   t.en_us_name,
      namePtBr: t.pt_br_name,
      sort:     t.sort_order,
    }));

    formatted.sort((a, b) => b.sort - a.sort);

    cache.set(CACHE_KEY, formatted, cache.TTL.productTypes);
    res.json({ source: 'api', data: formatted });
  } catch (err) {
    console.error('[ProductTypes] Erro:', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
