-- Create Notification table + enum in schema `public`.
-- Prisma runtime currently targets `public` (default schema), so the table must exist there.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'NotificationType' AND n.nspname = 'public') THEN
    CREATE TYPE public."NotificationType" AS ENUM (
      'ORDER_CREATED',
      'MESSAGE_RECEIVED',
      'TASK_CREATED',
      'MEETING_CREATED',
      'CALENDAR_EVENT_CREATED'
    );
  END IF;
END $$;

-- If enum already exists, ensure newest value is present.
DO $$
BEGIN
  BEGIN
    ALTER TYPE public."NotificationType" ADD VALUE IF NOT EXISTS 'CALENDAR_EVENT_CREATED';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE TABLE IF NOT EXISTS public."Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" public."NotificationType" NOT NULL,
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
    ALTER TABLE public."Notification"
      ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES public."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON public."Notification"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"
  ON public."Notification"("userId", "readAt");

