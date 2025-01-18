/*
  Warnings:

  - Added the required column `original_name` to the `PDFContent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PDFContent" ADD COLUMN     "original_name" VARCHAR(255) NOT NULL;
