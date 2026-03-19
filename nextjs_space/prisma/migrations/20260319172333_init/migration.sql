-- CreateTable
CREATE TABLE "League" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "logo" TEXT,
    "flag" TEXT,
    "season" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "timezone" TEXT NOT NULL,
    "venue" TEXT,
    "status" TEXT NOT NULL,
    "elapsed" INTEGER,
    "leagueId" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "round" TEXT,
    "homeTeamId" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayTeamId" INTEGER NOT NULL,
    "awayScore" INTEGER,
    "statistics" JSONB,
    "h2h" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Odd" (
    "id" SERIAL NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "betType" TEXT NOT NULL,
    "homeOdd" DOUBLE PRECISION,
    "drawOdd" DOUBLE PRECISION,
    "awayOdd" DOUBLE PRECISION,
    "overOdd" DOUBLE PRECISION,
    "underOdd" DOUBLE PRECISION,
    "line" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Odd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" SERIAL NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "valueBets" JSONB,
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "id" SERIAL NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColtPick" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "league" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "marketType" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "recommendedOddsMin" DECIMAL(10,2) NOT NULL,
    "currentOddsAtPick" DECIMAL(10,2),
    "bookmaker" TEXT,
    "stakeUnits" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ColtPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColtPickResult" (
    "id" TEXT NOT NULL,
    "coltPickId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "finalOdds" DECIMAL(10,2),
    "profitUnits" DECIMAL(10,2) NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColtPickResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bankrollEstimate" DECIMAL(12,2),
    "riskProfile" TEXT NOT NULL DEFAULT 'MODERATE',
    "favoriteLeagues" JSONB NOT NULL DEFAULT '[]',
    "preferredMarkets" JSONB NOT NULL DEFAULT '[]',
    "minOdds" DECIMAL(10,2),
    "maxOdds" DECIMAL(10,2),
    "maxPicksPerDay" INTEGER,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColtAnalysis" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "veredito" TEXT NOT NULL,
    "confianca" INTEGER NOT NULL,
    "analiseColt" TEXT NOT NULL,
    "alerta" TEXT,
    "placarProvavel" TEXT,
    "resumoRapido" TEXT,
    "dicas" JSONB NOT NULL,
    "rawResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColtAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationLog" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "league" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "marketType" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "currentOdds" DECIMAL(10,2) NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "fairOdds" DECIMAL(10,2) NOT NULL,
    "edgePercent" DECIMAL(5,2) NOT NULL,
    "confidence" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "coltPickId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_id_season_key" ON "League"("id", "season");

-- CreateIndex
CREATE INDEX "Fixture_date_idx" ON "Fixture"("date");

-- CreateIndex
CREATE INDEX "Fixture_leagueId_idx" ON "Fixture"("leagueId");

-- CreateIndex
CREATE INDEX "Odd_fixtureId_idx" ON "Odd"("fixtureId");

-- CreateIndex
CREATE INDEX "Prediction_fixtureId_idx" ON "Prediction"("fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCache_cacheKey_key" ON "ApiCache"("cacheKey");

-- CreateIndex
CREATE INDEX "ApiCache_cacheKey_idx" ON "ApiCache"("cacheKey");

-- CreateIndex
CREATE INDEX "ApiCache_expiresAt_idx" ON "ApiCache"("expiresAt");

-- CreateIndex
CREATE INDEX "ColtPick_matchId_idx" ON "ColtPick"("matchId");

-- CreateIndex
CREATE INDEX "ColtPick_status_idx" ON "ColtPick"("status");

-- CreateIndex
CREATE INDEX "ColtPick_kickoff_idx" ON "ColtPick"("kickoff");

-- CreateIndex
CREATE INDEX "ColtPick_createdAt_idx" ON "ColtPick"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ColtPickResult_coltPickId_key" ON "ColtPickResult"("coltPickId");

-- CreateIndex
CREATE INDEX "ColtPickResult_result_idx" ON "ColtPickResult"("result");

-- CreateIndex
CREATE INDEX "ColtPickResult_settledAt_idx" ON "ColtPickResult"("settledAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ColtAnalysis_matchId_key" ON "ColtAnalysis"("matchId");

-- CreateIndex
CREATE INDEX "ColtAnalysis_matchId_idx" ON "ColtAnalysis"("matchId");

-- CreateIndex
CREATE INDEX "ConversationLog_matchId_idx" ON "ConversationLog"("matchId");

-- CreateIndex
CREATE INDEX "ConversationLog_createdAt_idx" ON "ConversationLog"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_matchId_idx" ON "Alert"("matchId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_kickoff_idx" ON "Alert"("kickoff");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_leagueId_season_fkey" FOREIGN KEY ("leagueId", "season") REFERENCES "League"("id", "season") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odd" ADD CONSTRAINT "Odd_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColtPickResult" ADD CONSTRAINT "ColtPickResult_coltPickId_fkey" FOREIGN KEY ("coltPickId") REFERENCES "ColtPick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_coltPickId_fkey" FOREIGN KEY ("coltPickId") REFERENCES "ColtPick"("id") ON DELETE SET NULL ON UPDATE CASCADE;
