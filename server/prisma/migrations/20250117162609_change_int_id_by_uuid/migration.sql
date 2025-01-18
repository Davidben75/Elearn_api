/*
  Warnings:

  - The primary key for the `PDFContent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `VideoContent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Weblink` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "PDFContent" DROP CONSTRAINT "PDFContent_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "PDFContent_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PDFContent_id_seq";

-- AlterTable
ALTER TABLE "VideoContent" DROP CONSTRAINT "VideoContent_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "VideoContent_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VideoContent_id_seq";

-- AlterTable
ALTER TABLE "Weblink" DROP CONSTRAINT "Weblink_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Weblink_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Weblink_id_seq";
