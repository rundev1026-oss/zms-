-- CreateTable
CREATE TABLE "registry_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "registry_counters_pkey" PRIMARY KEY ("year")
);
