-- Add enum value for Jira provider
ALTER TYPE "OAuthProvider" ADD VALUE IF NOT EXISTS 'JIRA';

-- Extend OAuthIntegration with provider-specific metadata and sync timestamps
ALTER TABLE "OAuthIntegration"
ADD COLUMN IF NOT EXISTS "jiraCloudId" TEXT,
ADD COLUMN IF NOT EXISTS "jiraSiteUrl" TEXT,
ADD COLUMN IF NOT EXISTS "calendarLastSyncedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "contactsLastSyncedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "ticketsLastSyncedAt" TIMESTAMP(3);
