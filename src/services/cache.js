const NodeCache = require('node-cache');

const TTL = {
  shipping:     parseInt(process.env.CACHE_TTL_SHIPPING)      || 1800,
  countries:    parseInt(process.env.CACHE_TTL_COUNTRIES)     || 86400,
  productTypes: parseInt(process.env.CACHE_TTL_PRODUCT_TYPES) || 86400,
};

const store = new NodeCache({ stdTTL: TTL.shipping, checkperiod: 120 });

function shippingKey(params) {
  const { countryId, productTypeId, weight, length, width, height } = params;
  return `shipping:${countryId}:${productTypeId}:${weight}:${length}x${width}x${height}`;
}

function get(key)            { return store.get(key) || null; }
function set(key, value, ttl){ store.set(key, value, ttl); }
function del(key)            { store.del(key); }
function flush()             { store.flushAll(); console.log('[Cache] Limpo'); }
function stats()             { return store.getStats(); }

module.exports = { shippingKey, get, set, del, flush, stats, TTL };
