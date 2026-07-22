import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI } from './config.ts';

export class GoogleApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

const parseGoogleError = async (response: Response) => {
  try {
    const payload = await response.json() as { error?: string | { message?: string }; error_description?: string };
    if (typeof payload.error === 'object') return payload.error.message ?? `Google API HTTP ${response.status}`;
    return payload.error_description ?? payload.error ?? `Google API HTTP ${response.status}`;
  } catch {
    return `Google API HTTP ${response.status}`;
  }
};

export const exchangeAuthorizationCode = async (code: string): Promise<TokenResponse> => {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
    grant_type: 'authorization_code'
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  });
  if (!response.ok) throw new GoogleApiError(response.status, await parseGoogleError(response));
  return response.json() as Promise<TokenResponse>;
};

export const refreshGoogleAccessToken = async (refreshToken: string): Promise<TokenResponse> => {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token'
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  });
  if (!response.ok) throw new GoogleApiError(response.status, await parseGoogleError(response));
  return response.json() as Promise<TokenResponse>;
};

export const revokeGoogleToken = async (token: string) => {
  const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (!response.ok && response.status !== 400) throw new GoogleApiError(response.status, await parseGoogleError(response));
};

export const googleGet = async <T>(url: string, accessToken: string): Promise<T> => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new GoogleApiError(response.status, await parseGoogleError(response));
  return response.json() as Promise<T>;
};

export const getConferenceLink = (event: Record<string, unknown>) => {
  if (typeof event.hangoutLink === 'string') return event.hangoutLink;
  const conferenceData = event.conferenceData as { entryPoints?: Array<{ uri?: string; entryPointType?: string }> } | undefined;
  return conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri
    ?? conferenceData?.entryPoints?.find((entry) => entry.uri)?.uri;
};
