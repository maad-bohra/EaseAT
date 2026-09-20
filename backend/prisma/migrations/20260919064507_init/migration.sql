-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT', 'CANCELLED', 'NO_CLASS');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('HOLIDAY', 'WORKING_DAY', 'EXAM', 'VACATION', 'SEMESTER_START', 'SEMESTER_END', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('UPCOMING_CLASS', 'LOW_ATTENDANCE', 'BELOW_REQUIRED', 'HOLIDAY_TOMORROW', 'EXAM_APPROACHING', 'CLASS_RESCHEDULED', 'MISSED_CLASS', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('UPLOADED', 'TEXT_EXTRACTED', 'AI_PARSED', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "semester" INTEGER,
    "year" INTEGER,
    "collegeName" TEXT,
    "requiredAttendance" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "faculty" TEXT,
    "credits" INTEGER,
    "color" TEXT NOT NULL DEFAULT '#2F6F4E',
    "icon" TEXT,
    "requiredAttendance" DOUBLE PRECISION,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "classroom" TEXT,
    "faculty" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "timetableEntryId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "isRescheduled" BOOLEAN NOT NULL DEFAULT false,
    "markedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rescheduled_classes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalSessionId" TEXT NOT NULL,
    "newSessionId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rescheduled_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_calendar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'UPLOADED',
    "extractedText" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "subjects_userId_idx" ON "subjects"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_userId_name_key" ON "subjects"("userId", "name");

-- CreateIndex
CREATE INDEX "timetable_entries_userId_dayOfWeek_idx" ON "timetable_entries"("userId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_entries_userId_dayOfWeek_startTime_key" ON "timetable_entries"("userId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "attendance_sessions_userId_date_idx" ON "attendance_sessions"("userId", "date");

-- CreateIndex
CREATE INDEX "attendance_sessions_userId_subjectId_status_idx" ON "attendance_sessions"("userId", "subjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_userId_subjectId_date_startTime_key" ON "attendance_sessions"("userId", "subjectId", "date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "rescheduled_classes_originalSessionId_key" ON "rescheduled_classes"("originalSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "rescheduled_classes_newSessionId_key" ON "rescheduled_classes"("newSessionId");

-- CreateIndex
CREATE INDEX "rescheduled_classes_userId_idx" ON "rescheduled_classes"("userId");

-- CreateIndex
CREATE INDEX "academic_calendar_userId_date_idx" ON "academic_calendar"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "academic_calendar_userId_date_type_title_key" ON "academic_calendar"("userId", "date", "type", "title");

-- CreateIndex
CREATE INDEX "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_userId_dedupeKey_key" ON "notifications"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "uploaded_files_userId_idx" ON "uploaded_files"("userId");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "timetable_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rescheduled_classes" ADD CONSTRAINT "rescheduled_classes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rescheduled_classes" ADD CONSTRAINT "rescheduled_classes_originalSessionId_fkey" FOREIGN KEY ("originalSessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rescheduled_classes" ADD CONSTRAINT "rescheduled_classes_newSessionId_fkey" FOREIGN KEY ("newSessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_calendar" ADD CONSTRAINT "academic_calendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_calendar" ADD CONSTRAINT "academic_calendar_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
