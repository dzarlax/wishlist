const FLOW_COOKIE = 'wishlist_oidc_flow';
const FLOW_TTL_MS = 5 * 60 * 1000;
const COOKIE_PATH = '/api/auth/sso';
const MAX_PENDING_FLOWS = 1000;

function parseCookie(header, name) {
  if (!header) return null;
  const matches = header.split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  try {
    return decodeURIComponent(matches[0].slice(name.length + 1));
  } catch {
    return null;
  }
}

function setFlowCookie(res, state) {
  res.setHeader('Set-Cookie', `${FLOW_COOKIE}=${encodeURIComponent(state)}; Max-Age=300; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax`);
}

function clearFlowCookie(res) {
  res.setHeader('Set-Cookie', `${FLOW_COOKIE}=; Max-Age=0; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax`);
}

function deny(res) {
  return res.redirect('/#/login-error?error=oidc');
}

function isSingleQueryValue(value) {
  return typeof value === 'string' && value.length > 0;
}

function classifyUserInfoError(error) {
  if (error?.code === 'OAUTH_JSON_ATTRIBUTE_COMPARISON_FAILED') return 'userinfo_subject';
  if (error?.code === 'OAUTH_INVALID_RESPONSE' || error?.code === 'OAUTH_PARSE_ERROR' ||
      error?.code === 'OAUTH_RESPONSE_IS_NOT_CONFORM' || error?.code === 'OAUTH_RESPONSE_IS_NOT_JSON') return 'userinfo_protocol';
  return 'userinfo_fetch';
}

function emailFromVerifiedClaims(idClaims, userInfo) {
  const hasIdEmail = Object.hasOwn(idClaims, 'email');
  const hasIdVerification = Object.hasOwn(idClaims, 'email_verified');
  const hasUserInfoVerification = Object.hasOwn(userInfo, 'email_verified');

  if (hasIdVerification && typeof idClaims.email_verified !== 'boolean' ||
      hasUserInfoVerification && typeof userInfo.email_verified !== 'boolean' ||
      idClaims.email_verified === false || userInfo.email_verified === false) {
    return { error: 'userinfo_verification' };
  }
  if (typeof userInfo.email !== 'string' || userInfo.email.trim().length === 0 ||
      hasIdEmail && (typeof idClaims.email !== 'string' || idClaims.email.trim().length === 0) ||
      hasIdEmail && idClaims.email !== userInfo.email) {
    return { error: 'userinfo_email' };
  }

  const verifiedIdEmail = idClaims.email_verified === true && hasIdEmail;
  const verifiedUserInfoEmail = userInfo.email_verified === true;
  if (!verifiedIdEmail && !verifiedUserInfoEmail) return { error: 'userinfo_verification' };

  return { email: userInfo.email };
}

function createOidcAuth({ settings, userModel, generateToken, logger = console, clientLoader = () => import('openid-client'), now = () => Date.now() }) {
  const flows = new Map();
  const issuer = new URL(settings.oidcIssuer).href;
  const redirectUri = `${settings.appUrl.replace(/\/$/, '')}/api/auth/sso/callback`;
  let client;
  let clientConfig;

  async function initialize() {
    client = await clientLoader();
    clientConfig = await client.discovery(
      new URL(issuer),
      settings.oidcClientId,
      undefined,
      client.ClientSecretPost(settings.oidcClientSecret),
      { execute: [client.enableNonRepudiationChecks] }
    );
  }

  async function redirect(_req, res) {
    try {
      if (!clientConfig) throw new Error('not_initialized');
      const state = client.randomState();
      const nonce = client.randomNonce();
      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      for (const [pendingState, flow] of flows) {
        if (flow.expiresAt <= now()) flows.delete(pendingState);
      }
      if (flows.size >= MAX_PENDING_FLOWS) throw new Error('flow_limit');
      flows.set(state, {
        state,
        nonce,
        codeVerifier,
        issuer,
        clientId: settings.oidcClientId,
        redirectUri,
        expiresAt: now() + FLOW_TTL_MS
      });
      const authorizationUrl = client.buildAuthorizationUrl(clientConfig, {
        redirect_uri: redirectUri,
        scope: 'openid email profile',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });
      setFlowCookie(res, state);
      return res.redirect(authorizationUrl.href);
    } catch {
      logger.warn('OIDC flow failed: redirect_setup');
      return deny(res);
    }
  }

  async function callback(req, res) {
    const cookieState = parseCookie(req.headers.cookie, FLOW_COOKIE);
    const state = req.query.state;
    const code = req.query.code;
    const flow = isSingleQueryValue(state) ? flows.get(state) : null;

    if (flow) flows.delete(state);
    clearFlowCookie(res);

    if (!flow || !cookieState || cookieState !== state || !isSingleQueryValue(code) || flow.expiresAt <= now()) {
      return deny(res);
    }
    if (flow.issuer !== issuer || flow.clientId !== settings.oidcClientId || flow.redirectUri !== redirectUri) {
      return deny(res);
    }

    let failureStage = 'token_exchange';
    try {
      const currentUrl = new URL(req.originalUrl, settings.appUrl);
      const tokens = await client.authorizationCodeGrant(clientConfig, currentUrl, {
        expectedState: flow.state,
        expectedNonce: flow.nonce,
        pkceCodeVerifier: flow.codeVerifier
      });
      let claims;
      try {
        claims = typeof tokens.claims === 'function' ? tokens.claims() : null;
      } catch {
        failureStage = 'claims_decode';
        throw new Error('claims_decode');
      }
      failureStage = 'id_token_validation';
      if (!claims) {
        failureStage = 'id_token_missing';
        throw new Error('id_token_missing');
      }
      if (claims.iss !== clientConfig.serverMetadata().issuer) {
        failureStage = 'issuer_validation';
        throw new Error('issuer_mismatch');
      }
      if (typeof claims.sub !== 'string' || !claims.sub) {
        failureStage = 'subject_validation';
        throw new Error('subject_missing');
      }
      if (!Array.isArray(claims.aud) && claims.aud !== settings.oidcClientId ||
          Array.isArray(claims.aud) && !claims.aud.includes(settings.oidcClientId) ||
          Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== settings.oidcClientId) {
        failureStage = 'audience_validation';
        throw new Error('audience_mismatch');
      }
      if (!Number.isFinite(claims.exp) || claims.exp <= Math.floor(now() / 1000)) {
        failureStage = 'expiry_validation';
        throw new Error('token_expired');
      }
      if (claims.nonce !== flow.nonce) {
        failureStage = 'nonce_validation';
        throw new Error('invalid_id_token_claims');
      }

      let userInfo;
      try {
        userInfo = await client.fetchUserInfo(clientConfig, tokens.access_token, claims.sub);
      } catch (error) {
        failureStage = classifyUserInfoError(error);
        throw new Error(failureStage);
      }
      if (!userInfo || userInfo.sub !== claims.sub) {
        failureStage = 'userinfo_subject';
        throw new Error(failureStage);
      }
      const emailResult = emailFromVerifiedClaims(claims, userInfo);
      if (emailResult.error) {
        failureStage = emailResult.error;
        throw new Error(failureStage);
      }

      failureStage = 'account_match';
      const user = await userModel.findUniqueByEmail(emailResult.email);
      if (!user || user.email !== emailResult.email) {
        return deny(res);
      }
      const appToken = generateToken(user);
      return res.redirect(`/#/sso-complete?token=${encodeURIComponent(appToken)}&slug=${encodeURIComponent(user.slug)}`);
    } catch {
      logger.warn(`OIDC callback denied: ${failureStage}`);
      return deny(res);
    }
  }

  return { initialize, redirect, callback, pendingFlowCount: () => flows.size };
}

module.exports = { createOidcAuth, FLOW_COOKIE, FLOW_TTL_MS, COOKIE_PATH };
