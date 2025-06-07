import express from "express";
import multer from "multer";
import {
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
  getUploadVideoUrl,
} from "../controllers/courseController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", listCourses);
router.post("/", verifyToken, createCourse);

router.get("/:courseId", getCourse);
router.put("/:courseId", verifyToken, upload.single("image"), updateCourse);
router.delete("/:courseId", verifyToken, deleteCourse);

router.post(
  "/:courseId/sections/:sectionId/chapters/:chapterId/get-upload-url",
  verifyToken,
  getUploadVideoUrl
);

export default router;
