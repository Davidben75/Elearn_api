/*
  Warnings:

  - A unique constraint covering the columns `[module_id]` on the table `PDFContent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[module_id]` on the table `VideoContent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[module_id]` on the table `Weblink` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "PDFContent" DROP CONSTRAINT "PDFContent_id_fkey";

-- DropForeignKey
ALTER TABLE "VideoContent" DROP CONSTRAINT "VideoContent_id_fkey";

-- DropForeignKey
ALTER TABLE "Weblink" DROP CONSTRAINT "Weblink_id_fkey";

-- AlterTable
ALTER TABLE "PDFContent" ALTER COLUMN "page_count" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VideoContent" ALTER COLUMN "duration" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PDFContent_module_id_key" ON "PDFContent"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "VideoContent_module_id_key" ON "VideoContent"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "Weblink_module_id_key" ON "Weblink"("module_id");

-- AddForeignKey
ALTER TABLE "VideoContent" ADD CONSTRAINT "VideoContent_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDFContent" ADD CONSTRAINT "PDFContent_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weblink" ADD CONSTRAINT "Weblink_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
