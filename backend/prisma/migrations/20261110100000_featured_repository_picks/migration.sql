ALTER TABLE "MemberProfile"
ADD COLUMN "featuredRepositoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
