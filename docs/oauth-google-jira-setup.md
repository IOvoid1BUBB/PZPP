# OAuth setup: Google + Jira

## Environment variables

Set in `.env`:

- `NEXTAUTH_URL=http://localhost:3000`
- `INTERNAL_OAUTH_STATE_SECRET=<32+ chars>`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback`
- `GOOGLE_OAUTH_SCOPES=openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly`
- `JIRA_OAUTH_CLIENT_ID`
- `JIRA_OAUTH_CLIENT_SECRET`
- `JIRA_OAUTH_REDIRECT_URI=http://localhost:3000/api/integrations/jira/callback`
- `JIRA_OAUTH_SCOPES=read:jira-work read:jira-user offline_access`

## Google Cloud Console

1. Create OAuth 2.0 client (Web application).
2. Add redirect URI: `http://localhost:3000/api/integrations/google/callback`
3. Add scopes used by app:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/contacts.readonly`
4. If app is in testing mode, add your account as test user.

## Atlassian Developer Console

1. Create OAuth 2.0 integration.
2. Configure callback URL: `http://localhost:3000/api/integrations/jira/callback`
3. Add scopes:
   - `read:jira-work`
   - `read:jira-user`
   - `offline_access`

## Manual end-to-end tests

### Google

1. `Ustawienia -> Integracje -> Połącz z Google`
2. Accept consent.
3. Verify `Połączono`, preview events and contacts.
4. Click `Sync now` and check:
   - calendar data in dashboard calendar,
   - contacts visible in Inbox (imported as leads).
5. Disconnect and verify status changes.

### Jira

1. `Ustawienia -> Integracje -> Połącz z Jira`
2. Accept consent.
3. Select project and click `Sync now`.
4. Verify tickets in Integracje preview and Kanban Jira section.
5. Disconnect and verify status changes.
