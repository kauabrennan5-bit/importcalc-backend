const axios  = require('axios');
const auth   = require('../auth/hubbuy');

const BASE = process.env.HUBBUY_BASE_URL || 'https://api.hubbuycn.com';

const client = axios.create({
  baseURL: BASE,
  timeout: 20000,
});

client.interceptors.request.use(async (config) => {
  const headers = await auth.getAuthHeaders();
  Object.assign(config.headers, headers);
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;

    if (status === 401 && !error.config._retried) {
      console.log('[Client] 401 — fazendo re-login...');
      auth.invalidateToken();
      try {
        await auth.login();
        error.config._retried = true;
        const headers = await auth.getAuthHeaders();
        Object.assign(error.config.headers, headers);
        return client.request(error.config);
      } catch (loginErr) {
        throw new Error(`Re-login falhou: ${loginErr.message}`);
      }
    }

    const msg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error?.message ||
      'Erro desconhecido na API HubbuyCN';

    const err = new Error(msg);
    err.status = status || 500;
    throw err;
  }
);

module.exports = client;
