/*
  Warnings:

  - You are about to drop the column `content_id` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the column `content_type` on the `Module` table. All the data in the column will be lost.
  - Added the required column `contentType` to the `Module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module_id` to the `PDFContent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module_id` to the `VideoContent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module_id` to the `Weblink` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'PDF', 'WEBLINK');

-- AlterTable
ALTER TABLE "Module" DROP COLUMN "content_id",
DROP COLUMN "content_type",
ADD COLUMN     "contentType" "ContentType" NOT NULL;

-- AlterTable
ALTER TABLE "PDFContent" ADD COLUMN     "module_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "VideoContent" ADD COLUMN     "module_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Weblink" ADD COLUMN     "module_id" INTEGER NOT NULL;
