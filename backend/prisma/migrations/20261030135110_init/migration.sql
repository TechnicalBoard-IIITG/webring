-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "legacyEmail" TEXT,
    "legacySourceId" TEXT,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "github" TEXT,
    "portfolio" TEXT,
    "leetcode" TEXT,
    "codeforces" TEXT,
    "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "banner" TEXT,
    "bio" TEXT,
    "linkedin" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileRevision" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_ownerId_key" ON "MemberProfile"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_legacySourceId_key" ON "MemberProfile"("legacySourceId");

-- CreateIndex
CREATE INDEX "MemberProfile_year_idx" ON "MemberProfile"("year");

-- CreateIndex
CREATE INDEX "MemberProfile_name_idx" ON "MemberProfile"("name");

-- CreateIndex
CREATE INDEX "MemberProfile_github_idx" ON "MemberProfile"("github");

-- CreateIndex
CREATE INDEX "MemberProfile_legacyEmail_idx" ON "MemberProfile"("legacyEmail");

-- CreateIndex
CREATE INDEX "ProfileRevision_profileId_createdAt_idx" ON "ProfileRevision"("profileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRecord_sourceKey_key" ON "ImportRecord"("sourceKey");

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRevision" ADD CONSTRAINT "ProfileRevision_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRevision" ADD CONSTRAINT "ProfileRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
