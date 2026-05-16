ALTER TABLE "usuarios"
ADD COLUMN "google_calendar_email" TEXT,
ADD COLUMN "google_access_token" TEXT,
ADD COLUMN "google_refresh_token" TEXT,
ADD COLUMN "google_token_expires_at" TIMESTAMP(3);

ALTER TABLE "eventos"
ADD COLUMN "google_calendar_event_id" TEXT;
