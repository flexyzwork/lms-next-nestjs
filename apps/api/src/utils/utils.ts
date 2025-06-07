import * as path from 'path';

export const updateCourseVideoInfo = (course: any, sectionId: string, chapterId: string, videoUrl: string) => {
  const section = course.sections?.find((s: any) => s.sectionId === sectionId);
  if (!section) {
    throw new Error(`Section not found: ${sectionId}`);
  }

  const chapter = section.chapters?.find((c: any) => c.chapterId === chapterId);
  if (!chapter) {
    throw new Error(`Chapter not found: ${chapterId}`);
  }

  chapter.video = videoUrl;
  chapter.type = 'Video';
};

export const validateUploadedFiles = (files: any) => {
  const allowedExtensions = ['.mp4', '.m3u8', '.mpd', '.ts', '.m4s'];
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }
};

export const getContentType = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.m3u8':
      return 'application/vnd.apple.mpegurl';
    case '.mpd':
      return 'application/dash+xml';
    case '.ts':
      return 'video/MP2T';
    case '.m4s':
      return 'video/iso.segment';
    default:
      return 'application/octet-stream';
  }
};

// Preserved HLS/DASH upload logic for future use
export const handleAdvancedVideoUpload = async (s3: any, files: any, uniqueId: string, bucketName: string) => {
  const isHLSOrDASH = files.some(
    (file: any) => file.originalname.endsWith('.m3u8') || file.originalname.endsWith('.mpd')
  );

  if (isHLSOrDASH) {
    // Handle HLS/MPEG-DASH Upload
    const uploadPromises = files.map((file: any) => {
      const s3Key = `videos/${uniqueId}/${file.originalname}`;
      return s3
        .upload({
          Bucket: bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: getContentType(file.originalname),
        })
        .promise();
    });
    await Promise.all(uploadPromises);

    // Determine manifest file URL
    const manifestFile = files.find(
      (file: any) => file.originalname.endsWith('.m3u8') || file.originalname.endsWith('.mpd')
    );
    const manifestFileName = manifestFile?.originalname || '';
    const videoType = manifestFileName.endsWith('.m3u8') ? 'hls' : 'dash';

    return {
      videoUrl: `${process.env.CLOUDFRONT_DOMAIN}/videos/${uniqueId}/${manifestFileName}`,
      videoType,
    };
  }

  return null; // Return null if not HLS/DASH to handle regular upload
};

export const mergeSections = (existingSections: any[], newSections: any[]): any[] => {
  // 방어적 코딩: 배열이 아닌 경우 빈 배열로 초기화
  const safeExistingSections = Array.isArray(existingSections) ? existingSections : [];
  const safeNewSections = Array.isArray(newSections) ? newSections : [];

  const existingSectionsMap = new Map<string, any>();

  // 기존 섹션들을 Map에 추가
  for (const existingSection of safeExistingSections) {
    // 객체가 유효한지 확인 (문자열이 아닌 객체인지)
    if (
      existingSection &&
      typeof existingSection === 'object' &&
      existingSection !== null &&
      typeof existingSection !== 'string' &&
      existingSection.sectionId
    ) {
      existingSectionsMap.set(existingSection.sectionId, existingSection);
    }
  }

  // 새로운 섹션들을 Map에 병합
  for (const newSection of safeNewSections) {
    if (
      newSection &&
      typeof newSection === 'object' &&
      newSection !== null &&
      typeof newSection !== 'string' &&
      newSection.sectionId
    ) {
      const section = existingSectionsMap.get(newSection.sectionId);
      if (!section) {
        // Add new section
        existingSectionsMap.set(newSection.sectionId, newSection);
      } else {
        // 기존 섹션이 유효한 객체인지 한 번 더 확인
        if (typeof section === 'object' && section !== null && typeof section !== 'string') {
          // Merge chapters within the existing section
          section.chapters = mergeChapters(section.chapters || [], newSection.chapters || []);
          existingSectionsMap.set(newSection.sectionId, section);
        } else {
          // 기존 섹션이 유효하지 않으면 새 섹션으로 교체
          existingSectionsMap.set(newSection.sectionId, newSection);
        }
      }
    }
  }

  return Array.from(existingSectionsMap.values());
};

// 안전한 JSON 파싱 및 데이터 정리 함수
export const safeParseProgressData = (rawData: any): any => {
  try {
    let parsedData = rawData;

    // 문자열인 경우 JSON 파싱 시도
    if (typeof rawData === 'string') {
      // 손상된 JSON 문자열 정리 (']' 같은 불완전한 데이터)
      if (rawData.trim() === ']' || rawData.trim() === '[' || rawData.trim() === '') {
        return { sections: [] };
      }
      parsedData = JSON.parse(rawData);
    }

    // null이나 undefined인 경우
    if (!parsedData) {
      return { sections: [] };
    }

    // 기본 구조 보장
    return {
      sections: Array.isArray(parsedData.sections) ? parsedData.sections : [],
      ...parsedData,
    };
  } catch (error) {
    console.error('Progress data parsing error:', error, 'Raw data:', rawData);
    return { sections: [] };
  }
};

export const mergeChapters = (existingChapters: any[], newChapters: any[]): any[] => {
  // 방어적 코딩: 배열이 아닌 경우 빈 배열로 초기화
  const safeExistingChapters = Array.isArray(existingChapters) ? existingChapters : [];
  const safeNewChapters = Array.isArray(newChapters) ? newChapters : [];

  const existingChaptersMap = new Map<string, any>();

  // 기존 챕터들을 Map에 추가
  for (const existingChapter of safeExistingChapters) {
    if (existingChapter && existingChapter.chapterId) {
      existingChaptersMap.set(existingChapter.chapterId, existingChapter);
    }
  }

  // 새로운 챕터들을 Map에 병합
  for (const newChapter of safeNewChapters) {
    if (newChapter && newChapter.chapterId) {
      existingChaptersMap.set(newChapter.chapterId, {
        ...(existingChaptersMap.get(newChapter.chapterId) || {}),
        ...newChapter,
      });
    }
  }

  return Array.from(existingChaptersMap.values());
};

export const calculateOverallProgress = (sections: any) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return 0; // Ensure sections is always an array and not undefined
  }

  const totalChapters = sections.reduce((sum, section) => {
    if (!section || !Array.isArray(section.chapters)) return sum;
    return sum + section.chapters.length;
  }, 0);

  if (totalChapters === 0) return 0;

  const completedChapters = sections.reduce((sum, section) => {
    if (!section || !Array.isArray(section.chapters)) return sum;
    return sum + section.chapters.filter((chapter: any) => chapter?.completed).length;
  }, 0);

  return (completedChapters / totalChapters) * 100;
};
