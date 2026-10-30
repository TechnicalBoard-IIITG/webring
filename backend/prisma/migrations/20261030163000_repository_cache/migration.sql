-- CreateTable
CREATE TABLE "GitHubRepository" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "ownerLogin" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT,
    "languageBytes" JSONB NOT NULL DEFAULT '{}',
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "pushedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFork" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GitHubRepository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRepository" (
    "memberId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'owner',
    "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberRepository_pkey" PRIMARY KEY ("memberId","repositoryId")
);

-- CreateTable
CREATE TABLE "MemberGitHubSummary" (
    "memberId" TEXT NOT NULL,
    "github" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3),
    "attemptedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "languages" JSONB NOT NULL DEFAULT '{}',
    "activity" JSONB NOT NULL DEFAULT '[]',
    "repositoryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MemberGitHubSummary_pkey" PRIMARY KEY ("memberId")
);

-- CreateTable
CREATE TABLE "RepositoryNomination" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "RepositoryNomination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepository_githubId_key" ON "GitHubRepository"("githubId");

-- CreateIndex
CREATE INDEX "GitHubRepository_stars_id_idx" ON "GitHubRepository"("stars", "id");

-- CreateIndex
CREATE INDEX "GitHubRepository_pushedAt_id_idx" ON "GitHubRepository"("pushedAt", "id");

-- CreateIndex
CREATE INDEX "GitHubRepository_language_idx" ON "GitHubRepository"("language");

-- CreateIndex
CREATE INDEX "MemberRepository_repositoryId_idx" ON "MemberRepository"("repositoryId");

-- CreateIndex
CREATE INDEX "RepositoryNomination_status_createdAt_idx" ON "RepositoryNomination"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryNomination_memberId_fullName_key" ON "RepositoryNomination"("memberId", "fullName");

-- AddForeignKey
ALTER TABLE "MemberRepository" ADD CONSTRAINT "MemberRepository_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRepository" ADD CONSTRAINT "MemberRepository_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitHubRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGitHubSummary" ADD CONSTRAINT "MemberGitHubSummary_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryNomination" ADD CONSTRAINT "RepositoryNomination_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
