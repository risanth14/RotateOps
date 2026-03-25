-- CreateTable
CREATE TABLE "ConsentGrant" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "callbackState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentGrant_integrationId_idx" ON "ConsentGrant"("integrationId");

-- AlterTable: make jobId nullable on AuditEvent, add actor + consentGrantId
ALTER TABLE "AuditEvent" ALTER COLUMN "jobId" DROP NOT NULL;
ALTER TABLE "AuditEvent" ADD COLUMN "actor" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "consentGrantId" TEXT;

-- AlterTable: add actor + consentGrantId to RotationJob
ALTER TABLE "RotationJob" ADD COLUMN "actor" TEXT;
ALTER TABLE "RotationJob" ADD COLUMN "consentGrantId" TEXT;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_consentGrantId_fkey" FOREIGN KEY ("consentGrantId") REFERENCES "ConsentGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationJob" ADD CONSTRAINT "RotationJob_consentGrantId_fkey" FOREIGN KEY ("consentGrantId") REFERENCES "ConsentGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
