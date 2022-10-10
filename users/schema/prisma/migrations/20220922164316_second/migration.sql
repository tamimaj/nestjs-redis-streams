/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[authId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `authId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "authId" TEXT NOT NULL,
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "emailVerified" BOOLEAN DEFAULT false,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isBlocked" BOOLEAN DEFAULT false,
ADD COLUMN     "isSubscribed" BOOLEAN DEFAULT true,
ADD COLUMN     "lastAppLaunch" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "signInProvider" TEXT DEFAULT 'password',
ADD COLUMN     "walletAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
