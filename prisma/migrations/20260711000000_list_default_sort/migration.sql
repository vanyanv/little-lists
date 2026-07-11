-- Add per-list saved sort preference (holds a SortMode id; null => "recent")
ALTER TABLE "List" ADD COLUMN "defaultSort" TEXT;
