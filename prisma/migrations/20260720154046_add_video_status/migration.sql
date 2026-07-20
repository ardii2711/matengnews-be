-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "status" "PostStatus" NOT NULL DEFAULT 'DRAFT';
