export interface CourseResponse {
  message: string;
  data: any;
}

export interface UploadVideoResponse {
  message: string;
  data: {
    uploadUrl: string;
    videoUrl: string;
  };
}

export interface User {
  userId: string;
  id: string;
  email: string;
  userType: string;
}
