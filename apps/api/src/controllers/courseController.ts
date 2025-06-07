// import express, { Request, Response } from 'express';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { db } from '@packages/database';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { User } from '../middleware/authMiddleware';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// const prisma = new PrismaClient();

/**
 * 🔹 강의 목록 조회
 */
export const listCourses = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const { category } = req.query;

  try {
    const courses = await db.course.findMany({
      where:
        category && category !== 'all'
          ? { category: String(category) }
          : undefined,
      include: {
        sections: {
          include: {
            chapters: true,
          },
        },
      },
    });

    res.json({ message: 'Courses retrieved successfully', data: courses });
  } catch (error) {
    console.error('❌ Error retrieving courses:', error);
    res.status(500).json({ message: 'Error retrieving courses', error });
  }
};

/**
 * 🔹 특정 강의 조회
 */
export const getCourse = async (req: express.Request, res: express.Response): Promise<void> => {
  const { courseId } = req.params;
  console.log(`🔍 Fetching course with ID: ${courseId}`);

  try {
    const course = await db.course.findUnique({
      where: { courseId },
      include: {
        sections: {
          include: { chapters: true },
        },
      },
    });

    console.log(`📌 Course Data:`, course); // 🔥 확인용 로그 추가

    if (!course) {
      console.warn(`⚠️ Course not found: ${courseId}`);
      res.status(404).json({ message: 'Course not found', data: null });
      return;
    }

    course.sections = course.sections || []; // 🔥 undefined 방지

    res.json({ message: 'Course retrieved successfully', data: course });
  } catch (error) {
    console.error(`❌ Error retrieving course(${courseId}):`, error);
    res.status(500).json({ message: 'Error retrieving course', error });
  }
};

/**
 * 🔹 강의 생성
 */
export const createCourse = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
    const { teacherId, teacherName } = req.body;

    if (!teacherId || !teacherName) {
      res.status(400).json({ message: 'Teacher Id and name are required' });
      return;
    }

    const newCourse = await db.course.create({
      data: {
        courseId: uuidv4(),
        teacherId,
        teacherName,
        title: 'Untitled Course',
        description: '',
        category: 'Uncategorized',
        image: '',
        price: 0,
        level: 'Beginner',
        status: 'Draft',
      },
    });

    res.json({ message: 'Course created successfully', data: newCourse });
  } catch (error) {
    res.status(500).json({ message: 'Error creating course', error });
  }
};

/**
 * 🔹 강의 업데이트 (Prisma 트랜잭션 적용)
 */
export const updateCourse = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const { courseId } = req.params;
  let updateData = { ...req.body };
  const user = req.user as User;
  const userId = user.userId;

  try {
    const existingCourse = await db.course.findUnique({
      where: { courseId },
      include: {
        sections: { include: { chapters: true } },
      },
    });

    if (!existingCourse) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    if (existingCourse.teacherId !== userId) {
      res.status(403).json({ message: 'Not authorized to update this course' });
      return;
    }

    if (updateData.price) {
      const price = parseInt(updateData.price);
      if (isNaN(price)) {
        res.status(400).json({ message: 'Invalid price format' });
        return;
      }
      updateData.price = price * 100;
    }

    // 🔥 `sections`가 문자열이면 JSON으로 변환
    if (typeof updateData.sections === 'string') {
      try {
        updateData.sections = JSON.parse(updateData.sections);
      } catch (error) {
        console.error(
          `❌ Invalid JSON format for sections:`,
          updateData.sections
        );
        res.status(400).json({ message: 'Invalid sections format' });
        return;
      }
    }

    const updatedSections = Array.isArray(updateData.sections)
      ? updateData.sections.map((section: any) => ({
          sectionId: section.sectionId || uuidv4(),
          sectionTitle: section.sectionTitle,
          sectionDescription: section.sectionDescription,
          chapters: Array.isArray(section.chapters)
            ? section.chapters.map((chapter: any) => ({
                chapterId: chapter.chapterId || uuidv4(),
                type: chapter.type as 'Text' | 'Quiz' | 'Video',
                title: chapter.title,
                content: chapter.content,
                video: chapter.video,
              }))
            : [],
        }))
      : [];

    await db.$transaction(async (tx) => {
      // ✅ 코스 정보 업데이트 (제목, 설명, 가격 등)
      await tx.course.update({
        where: { courseId },
        data: {
          title: updateData.title,
          description: updateData.description,
          category: updateData.category,
          price: updateData.price,
          status: updateData.status,
        },
      });

      // ✅ 섹션 업데이트 (기존 데이터 유지, 변경 사항만 반영)
      for (const section of updatedSections) {
        await tx.section.upsert({
          where: { sectionId: section.sectionId },
          update: {
            sectionTitle: section.sectionTitle,
            sectionDescription: section.sectionDescription,
          },
          create: {
            sectionId: section.sectionId,
            courseId,
            sectionTitle: section.sectionTitle,
            sectionDescription: section.sectionDescription,
          },
        });

        // ✅ 챕터 업데이트 (기존 데이터 유지, 변경 사항만 반영)
        for (const chapter of section.chapters) {
          await tx.chapter.upsert({
            where: { chapterId: chapter.chapterId },
            update: {
              type: chapter.type,
              title: chapter.title,
              content: chapter.content,
              video: chapter.video,
            },
            create: {
              chapterId: chapter.chapterId,
              sectionId: section.sectionId,
              type: chapter.type,
              title: chapter.title,
              content: chapter.content,
              video: chapter.video,
            },
          });
        }
      }
    });

    // ✅ 최종 반영된 데이터 반환
    const updatedCourse = await db.course.findUnique({
      where: { courseId },
      include: { sections: { include: { chapters: true } } },
    });

    res.json({ message: 'Course updated successfully', data: updatedCourse });
  } catch (error) {
    console.error(`❌ Error updating course(${courseId}):`, error);
    res.status(500).json({ message: 'Error updating course', error });
  }
};

/**
 * 🔹 강의 삭제
 */
export const deleteCourse = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const { courseId } = req.params;
  const user = req.user as User;
  const userId = user.id;

  try {
    const course = await db.course.findUnique({ where: { courseId } });

    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    if (course.teacherId !== userId) {
      res.status(403).json({ message: 'Not authorized to delete this course' });
      return;
    }

    await db.course.delete({ where: { courseId } });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course', error });
  }
};

export const getUploadVideoUrl = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const { fileName, fileType } = req.body;

  if (!fileName || !fileType) {
    res.status(400).json({ message: 'File name and type are required' });
    return;
  }

  try {
    const uniqueId = uuidv4();
    const s3Key = `videos/${uniqueId}/${fileName}`;

    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: fileType,
    };

    const command = new PutObjectCommand(s3Params);
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const videoUrl = `${process.env.CLOUDFRONT_DOMAIN}/videos/${uniqueId}/${fileName}`;

    res.json({
      message: 'Upload URL generated successfully',
      data: { uploadUrl, videoUrl },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating upload URL', error });
  }
};
