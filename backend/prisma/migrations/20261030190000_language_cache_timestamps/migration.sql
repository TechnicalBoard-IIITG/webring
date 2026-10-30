-- Add independent cache timestamps; preserve all existing profiles and snapshots.
ALTER TABLE "MemberGitHubSummary"
ADD COLUMN "languageFetchedAt" TIMESTAMP(3),
ADD COLUMN "languageNextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "languageError" TEXT;
