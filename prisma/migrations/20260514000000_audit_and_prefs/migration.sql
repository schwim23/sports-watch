-- Add notification preferences to User
ALTER TABLE "User"
  ADD COLUMN "quietStart" INTEGER,
  ADD COLUMN "quietEnd"   INTEGER,
  ADD COLUMN "timezone"   TEXT;

-- Add per-team mute toggle to TeamFollow
ALTER TABLE "TeamFollow"
  ADD COLUMN "notifyMuted" BOOLEAN NOT NULL DEFAULT false;

-- New RefreshAudit table for cron observability
CREATE TABLE "RefreshAudit" (
  "id"             TEXT NOT NULL,
  "source"         TEXT NOT NULL,
  "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"     TIMESTAMP(3),
  "ok"             BOOLEAN NOT NULL DEFAULT false,
  "rowsProcessed"  INTEGER NOT NULL DEFAULT 0,
  "rowsUpdated"    INTEGER NOT NULL DEFAULT 0,
  "rowsSkipped"    INTEGER NOT NULL DEFAULT 0,
  "errorMessage"   TEXT,
  CONSTRAINT "RefreshAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RefreshAudit_source_startedAt_idx" ON "RefreshAudit"("source", "startedAt");
