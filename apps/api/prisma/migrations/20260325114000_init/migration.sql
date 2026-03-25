-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('github', 'vercel', 'stripe');

-- CreateEnum
CREATE TYPE "IntegrationMode" AS ENUM ('demo', 'provider');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('active', 'paused', 'error');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'success', 'failed', 'manual_intervention');

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "IntegrationMode" NOT NULL DEFAULT 'demo',
    "status" "IntegrationStatus" NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "secretFingerprint" TEXT,
    "maskedReference" TEXT,
    "lastRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationPolicy" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RotationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationJob" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "policyId" TEXT,
    "triggeredBy" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "aiSummary" TEXT,
    "oldFingerprint" TEXT,
    "newFingerprint" TEXT,
    "rollbackPerformed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RotationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretTarget" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecretTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RotationPolicy_integrationId_key" ON "RotationPolicy"("integrationId");

-- CreateIndex
CREATE INDEX "RotationJob_integrationId_createdAt_idx" ON "RotationJob"("integrationId", "createdAt");

-- CreateIndex
CREATE INDEX "RotationJob_status_createdAt_idx" ON "RotationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_integrationId_createdAt_idx" ON "AuditEvent"("integrationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_jobId_createdAt_idx" ON "AuditEvent"("jobId", "createdAt");

-- AddForeignKey
ALTER TABLE "RotationPolicy" ADD CONSTRAINT "RotationPolicy_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationJob" ADD CONSTRAINT "RotationJob_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationJob" ADD CONSTRAINT "RotationJob_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "RotationPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "RotationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretTarget" ADD CONSTRAINT "SecretTarget_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
