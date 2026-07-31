/**
 * Browser-side OIDC Authorization Code + PKCE helper.
 * Public configuration is supplied by M6_DCM-Auth.
 */
const CALLBACK_STATE_KEY = "facis_oidc_callback";
const CALLBACK_MAX_AGE_MS = 10 * 60 * 1000;

function toBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomValue(size = 32) {
  const bytes = new Uint8Array(size);
  window.crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function sha256Base64Url(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(new Uint8Array(digest));
}

function currentRedirectUri() {
  return window.location.origin + window.location.pathname;
}

function removeCallbackParameters() {
  const url = new URL(window.location.href);
  ["code", "state", "session_state", "iss", "kc_action_status", "error", "error_description", "error_uri"]
    .forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

export const oidcService = {
  async beginLogin(config, options = {}) {
    if (!config?.enabled || !config.authorizationEndpoint || !config.clientId) {
      throw new Error(config?.message || "Keycloak/OIDC is not configured.");
    }
    const verifier = randomValue(64);
    const challenge = await sha256Base64Url(verifier);
    const state = randomValue();
    const nonce = randomValue();
    const redirectUri = config.redirectUri || currentRedirectUri();
    sessionStorage.setItem(CALLBACK_STATE_KEY, JSON.stringify({
      state, nonce, verifier, redirectUri, createdAt: Date.now()
    }));
    const url = new URL(config.authorizationEndpoint);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scope || "openid profile email");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    if (options.action) url.searchParams.set("kc_action", options.action);
    window.location.assign(url.toString());
  },

  consumeCallback() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (!code && !error) return null;
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(CALLBACK_STATE_KEY) || "null");
    } catch (error_) {
      saved = null;
    }
    sessionStorage.removeItem(CALLBACK_STATE_KEY);
    removeCallbackParameters();
    if (error) {
      return { error, message: url.searchParams.get("error_description") || "Keycloak sign-in failed." };
    }
    if (!saved || !saved.state || saved.state !== url.searchParams.get("state")) {
      return { error: "invalid_state", message: "The OIDC callback state is invalid." };
    }
    if (!saved.createdAt || Date.now() - saved.createdAt > CALLBACK_MAX_AGE_MS) {
      return { error: "callback_expired", message: "The OIDC sign-in request has expired." };
    }
    return {
      code,
      verifier: saved.verifier,
      nonce: saved.nonce,
      redirectUri: saved.redirectUri
    };
  },

  completeLogout(config) {
    if (!config?.endSessionEndpoint) return false;
    const url = new URL(config.endSessionEndpoint);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("post_logout_redirect_uri", config.redirectUri || currentRedirectUri());
    window.location.assign(url.toString());
    return true;
  }
};
