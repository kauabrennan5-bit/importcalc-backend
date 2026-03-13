const express = require('express');
const router  = express.Router();
const client  = require('../services/hubbuyClient');
const cache   = require('../services/cache');

router.get('/', async (req, res) => {
  const CACHE_KEY = 'countries:all';

  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const response = await client.get('/api/Delivery/getCountryList');
    const countries = response.data?.data || [];

    const formatted = countries.map(c => ({
      id:       c.country_id,
      code:     c.country_code,
      name:     c.country_eng_name || c.country_name,
      isHot:    c.country_is_hot === 1,
    }));

    formatted.sort((a, b) => {
      if (a.isHot && !b.isHot) return -1;
      if (!a.isHot && b.isHot) return 1;
      return a.name.localeCompare(b.name);
    });

    cache.set(CACHE_KEY, formatted, cache.TTL.countries);
    res.json({ source: 'api', data: formatted });
  } catch (err) {
    console.error('[Countries] Erro:', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
