const axios = require('axios');

let state = {
  token: null,
  expiresAt: null,
  isLoggingIn: false,
  loginPromise: null,
};

const HUBBUY_BASE = process.env.HUBBUY_BASE_URL || 'https://api.hubbuycn.com';
const RENEW_BEFORE_MS = 60 * 60 * 1000;

async function login() {
  if (state.isLoggingIn && state.loginPromise) {
    return state.loginPromise;
  }
  state.isLoggingIn = true;
  state.loginPromise = _doLogin();
  try {
    return await state.loginPromise;
  } finally {
    state.isLoggingIn = false;
    state.loginPromise = null;
  }
}

async function _doLogin() {
  const email    = process.env.HUBBUY_EMAIL;
  const password = process.env.HUBBUY_PASSWORD;

  if (!email || !password) {
    throw new Error('HUBBUY_EMAIL e HUBBUY_PASSWORD não definidos');
  }

  console.log(`[Auth] Fazendo login como ${email}...`);

  const res = await axios.post(
    `${HUBBUY_BASE}/api/user/loginByPwd`,
    { email, password },
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin':       'https://www.hubbuycn.com',
        'Referer':      'https://www.hubbuycn.com/',
        'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      timeout: 15000,
    }
  );

  const data  = res.data;
  const token = data?.token || data?.data?.token || data?.data?.access_token;

  if (!token) {
    throw new Error(`Login falhou: ${data?.msg || 'token não encontrado'}`);
  }

  state.token     = token;
  state.expiresAt = Date.now() + 23 * 60 * 60 * 1000;

  console.log('[Auth] Login OK ✓');
  scheduleRenewal();
  return token;
}

async function getToken() {
  if (!state.token || Date.now() >= state.expiresAt) {
    return login();
  }
  return state.token;
}

function scheduleRenewal() {
  if (!state.expiresAt) return;
  const ms = state.expiresAt - Date.now() - RENEW_BEFORE_MS;
  if (ms <= 0) { login().catch(console.error); return; }
  setTimeout(() => {
    login().catch(err => {
      console.error('[Auth] Falha na renovação:', err.message);
      setTimeout(() => login().catch(console.error), 5 * 60 * 1000);
    });
  }, ms);
}

async function getAuthHeaders() {
  const token = await getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Origin':        'https://www.hubbuycn.com',
    'Referer':       'https://www.hubbuycn.com/',
    'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };
}

function invalidateToken() {
  state.token     = null;
  state.expiresAt = null;
}

module.exports = { login, getToken, getAuthHeaders, invalidateToken };
