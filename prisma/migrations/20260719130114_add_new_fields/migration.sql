-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "description" VARCHAR(255),
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "metaDesc" VARCHAR(300),
ADD COLUMN     "metaTitle" VARCHAR(255),
ADD COLUMN     "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "description" TEXT,
ADD COLUMN     "thumbnail_url" TEXT;
