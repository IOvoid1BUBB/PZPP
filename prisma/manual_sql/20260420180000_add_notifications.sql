-- Manual SQL patch for Notification model.
-- This repo currently has migration drift on the remote schema; using db execute avoids destructive reset.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'ORDER_CREATED',
      'MESSAGE_RECEIVED',
      'TASK_CREATED',
      'MEETING_CREATED',
      'CALENDAR_EVENT_CREATED'
    );
  END IF;
END $$;

DO $$
BEGIN
  -- If enum already exists (created earlier), ensure new value is present.
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    BEGIN
      ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CALENDAR_EVENT_CREATED';
    EXCEPTION
      WHEN duplicate_object THEN
        -- ignore
        NULL;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "url" TEXT,
  "entityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"
  ON "Notification"("userId", "readAt");

