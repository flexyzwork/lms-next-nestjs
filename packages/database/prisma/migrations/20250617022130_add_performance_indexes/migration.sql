-- CreateIndex
CREATE INDEX "chapters_sectionId_idx" ON "chapters"("sectionId");

-- CreateIndex
CREATE INDEX "chapters_type_idx" ON "chapters"("type");

-- CreateIndex
CREATE INDEX "chapters_createdAt_idx" ON "chapters"("createdAt");

-- CreateIndex
CREATE INDEX "comments_chapterId_idx" ON "comments"("chapterId");

-- CreateIndex
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

-- CreateIndex
CREATE INDEX "comments_chapterId_createdAt_idx" ON "comments"("chapterId", "createdAt");

-- CreateIndex
CREATE INDEX "courses_teacherId_idx" ON "courses"("teacherId");

-- CreateIndex
CREATE INDEX "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_level_idx" ON "courses"("level");

-- CreateIndex
CREATE INDEX "courses_createdAt_idx" ON "courses"("createdAt");

-- CreateIndex
CREATE INDEX "courses_price_idx" ON "courses"("price");

-- CreateIndex
CREATE INDEX "courses_status_category_idx" ON "courses"("status", "category");

-- CreateIndex
CREATE INDEX "courses_teacherId_status_idx" ON "courses"("teacherId", "status");

-- CreateIndex
CREATE INDEX "login_history_email_idx" ON "login_history"("email");

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");

-- CreateIndex
CREATE INDEX "login_history_success_idx" ON "login_history"("success");

-- CreateIndex
CREATE INDEX "login_history_createdAt_idx" ON "login_history"("createdAt");

-- CreateIndex
CREATE INDEX "login_history_ipAddress_idx" ON "login_history"("ipAddress");

-- CreateIndex
CREATE INDEX "login_history_email_success_createdAt_idx" ON "login_history"("email", "success", "createdAt");

-- CreateIndex
CREATE INDEX "sections_courseId_idx" ON "sections"("courseId");

-- CreateIndex
CREATE INDEX "sections_createdAt_idx" ON "sections"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_courseId_idx" ON "transactions"("courseId");

-- CreateIndex
CREATE INDEX "transactions_dateTime_idx" ON "transactions"("dateTime");

-- CreateIndex
CREATE INDEX "transactions_paymentProvider_idx" ON "transactions"("paymentProvider");

-- CreateIndex
CREATE INDEX "transactions_userId_dateTime_idx" ON "transactions"("userId", "dateTime");

-- CreateIndex
CREATE INDEX "user_course_progress_userId_idx" ON "user_course_progress"("userId");

-- CreateIndex
CREATE INDEX "user_course_progress_courseId_idx" ON "user_course_progress"("courseId");

-- CreateIndex
CREATE INDEX "user_course_progress_overallProgress_idx" ON "user_course_progress"("overallProgress");

-- CreateIndex
CREATE INDEX "user_course_progress_lastAccessedTimestamp_idx" ON "user_course_progress"("lastAccessedTimestamp");

-- CreateIndex
CREATE INDEX "user_course_progress_userId_lastAccessedTimestamp_idx" ON "user_course_progress"("userId", "lastAccessedTimestamp");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");
