import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SB_URL = 'https://zllishknfqylpommgnew.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGlzaGtuZnF5bHBvbW1nbmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTk4MDksImV4cCI6MjA5MDk3NTgwOX0.Tm7ZGifcT5Y2kBJxaTUK_ASQruVcpHrM9UDMtmQiT4A';
const STORAGE_KEY = 'eter-supabase-auth';
const MODE_KEY = 'eter-auth-mode';

const usernameToEmail = {
  blushyk: 'blushyk@eter.gg',
  tengrubytyp: 'tengrubytyp@eter.gg',
  ratatuii: 'ratatuii@eter.gg',
  licz1: 'licz1@eter.gg',
  mdzer: 'mdzer@eter.gg',
  future: 'future@eter.gg'
};

function getMode() {
  return localStorage.getItem(MODE_KEY) === 'local' ? 'local' : 'session';
}

function setMode(remember) {
  if (remember) {
    localStorage.setItem(MODE_KEY, 'local');
    sessionStorage.removeItem(MODE_KEY);
  } else {
    sessionStorage.setItem(MODE_KEY, 'session');
    localStorage.removeItem(MODE_KEY);
  }
}

function clearMode() {
  localStorage.removeItem(MODE_KEY);
  sessionStorage.removeItem(MODE_KEY);
}

const hybridStorage = {
  getItem(key) {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  },
  setItem(key, value) {
    if (getMode() === 'local') {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const supabase = createClient(SB_URL, SB_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: hybridStorage,
    storageKey: STORAGE_KEY
  }
});

const state = {
  user: null,
  profile: null,
  username: null,
  avatarUrl: null
};

let activeConfig = null;
let authStarted = false;
let isApplying = false;

function getEl(id) {
  return id ? document.getElementById(id) : null;
}

function setLoginButtonBusy(isBusy) {
  const btn = getEl(activeConfig?.loginBtnId);
  if (!btn) return;
  btn.disabled = isBusy;
  btn.textContent = isBusy ? 'Logowanie...' : 'Zaloguj się';
}

function getEmailForLogin(login) {
  const normalized = (login || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('@')) return normalized;
  return usernameToEmail[normalized] || null;
}

async function fetchProfile(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, display_name')
    .eq('id', userId)
    .single();
  return data || null;
}

function renderAuthUI() {
  if (!activeConfig) return;
  const avatar = getEl(activeConfig.loginAvatarId);
  const value = getEl(activeConfig.loginActionValueId);
  const dropdownName = getEl(activeConfig.dropdownUsernameId);
  const profileLink = getEl(activeConfig.profileLinkId);

  if (state.user && state.username) {
    if (value) value.textContent = state.username;
    if (dropdownName) dropdownName.textContent = state.username;
    if (avatar) {
      if (state.avatarUrl) {
        avatar.innerHTML = `<img src="${state.avatarUrl}" alt="${state.username}">`;
      } else {
        avatar.textContent = state.username.charAt(0).toUpperCase();
      }
    }
    if (profileLink) {
      profileLink.href = `profil.html?user=${encodeURIComponent(state.username)}`;
    }
  } else {
    if (value) value.textContent = 'Zaloguj';
    if (dropdownName) dropdownName.textContent = '-';
    if (avatar) {
      avatar.textContent = '?';
      avatar.innerHTML = '?';
    }
    if (profileLink) profileLink.href = 'profil.html';
  }
}

async function notifyPage() {
  renderAuthUI();
  if (typeof activeConfig?.onAuthStateResolved === 'function') {
    await activeConfig.onAuthStateResolved({ ...state });
  }
}

async function applySession(session) {
  if (isApplying) return;
  isApplying = true;
  try {
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      state.user = session.user;
      state.profile = profile;
      state.username = profile?.username || session.user.email || null;
      state.avatarUrl = profile?.avatar_url || null;
    } else {
      state.user = null;
      state.profile = null;
      state.username = null;
      state.avatarUrl = null;
    }
    await notifyPage();
  } finally {
    isApplying = false;
  }
}

async function restoreSession() {
  const { data: current } = await supabase.auth.getSession();
  let session = current?.session || null;
  if (!session) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null);
    session = refreshed?.data?.session || null;
  }
  await applySession(session);
}

export function getAuthState() {
  return { ...state };
}

export async function loginWithForm() {
  const usernameInput = getEl(activeConfig?.loginUsernameId);
  const passwordInput = getEl(activeConfig?.loginPasswordId);
  const rememberInput = getEl(activeConfig?.rememberMeId);
  const errorEl = getEl(activeConfig?.loginErrorId);

  if (errorEl) errorEl.textContent = '';

  const email = getEmailForLogin(usernameInput?.value || '');
  if (!email) {
    if (errorEl) errorEl.textContent = 'Nieznany login. Sprawdz pisownie.';
    return;
  }

  setMode(Boolean(rememberInput?.checked));
  setLoginButtonBusy(true);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwordInput?.value || ''
  });

  setLoginButtonBusy(false);

  if (error) {
    if (errorEl) errorEl.textContent = 'Bledne haslo lub login.';
    return;
  }

  if (typeof window.closeLoginModal === 'function') {
    window.closeLoginModal();
  }
}

export async function logout() {
  clearMode();
  hybridStorage.removeItem(STORAGE_KEY);
  await supabase.auth.signOut().catch(() => null);
  await applySession(null);
}

export async function initEterAuth(config) {
  activeConfig = config;

  window.handleLogin = loginWithForm;
  window.handleLogout = logout;

  const loginPassword = getEl(config.loginPasswordId);
  const loginUsername = getEl(config.loginUsernameId);

  if (loginUsername && !loginUsername.dataset.authBound) {
    loginUsername.dataset.authBound = '1';
    loginUsername.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loginPassword?.focus();
    });
  }

  if (loginPassword && !loginPassword.dataset.authBound) {
    loginPassword.dataset.authBound = '1';
    loginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loginWithForm();
    });
  }

  if (!authStarted) {
    authStarted = true;
    supabase.auth.onAuthStateChange(async (_, session) => {
      await applySession(session);
    });
  }

  await restoreSession();
  return getAuthState();
}
