# Google OAuth integration

## Required environment variables

Set the values in `.env` (or deployment secrets):

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI` (default local: `http://localhost:3000/api/integrations/google/callback`)
- `GOOGLE_OAUTH_SCOPES` (default: `openid email profile https://www.googleapis.com/auth/calendar.readonly`)
- `INTERNAL_OAUTH_STATE_SECRET` (32+ chars, used to hash state/nonce and encrypt tokens)

The app also supports fallback to:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Google Cloud Console setup

1. Create/select a Google Cloud project.
2. Configure OAuth consent screen.
3. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.readonly`
4. Create OAuth 2.0 Client ID (Web application).
5. Add authorized redirect URI:
   - `http://localhost:3000/api/integrations/google/callback` (dev)
   - your production callback URL.
6. Copy client id/secret to env vars.

## Manual test plan

1. Login as creator/admin user.
2. Open `Ustawienia -> Integracje`.
3. Click `Połącz z Google`.
4. Complete Google consent screen.
5. Verify:
   - status `Połączono`,
   - google account email shown,
   - events preview visible.
6. Click `Sync now` and verify `lastSyncedAt` updates.
7. Open calendar/dashboard and confirm Google events are present.
8. Click `Odłącz` and verify status returns to disconnected.

## Refresh and revoked consent

- Access token is refreshed automatically using stored refresh token.
- If refresh fails with revoked consent, integration status becomes `REVOKED`/`ERROR`.
- User can reconnect with `Połącz z Google`.
