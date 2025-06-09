import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as z from "zod";
import { api } from "../state/api";
import { toast } from "sonner";
import { createId as generateCuid2 } from "@paralleldrive/cuid2"; // 🆔 CUID2 직접 사용 (브라우저 호환)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 🆔 ID 생성 및 검증 유틸리티 (CUID2 기반)
export function createId(): string {
  return generateCuid2();
}

export function createIds(count: number): string[] {
  return Array.from({ length: count }, () => generateCuid2());
}

export function validateId(id: string): boolean {
  // CUID2는 24자, 첫 글자는 소문자, 나머지는 소문자+숫자
  const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
  return typeof id === 'string' && id.length === 24 && cuid2Regex.test(id);
}

// 임시 ID 생성 (클라이언트 사이드에서 사용)
export function createTempId(): string {
  return `temp_${generateCuid2()}`;
}

// 임시 ID인지 확인
export function isTempId(id: string): boolean {
  return id.startsWith('temp_');
}

// 임시 ID를 실제 ID로 변환
export function convertTempId(tempId: string): string {
  if (isTempId(tempId)) {
    return tempId.replace('temp_', '');
  }
  return tempId;
}

// Convert cents to formatted currency string (e.g., 4999 -> "$49.99")
export function formatPrice(cents: number | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

// Convert dollars to cents (e.g., "49.99" -> 4999)
export function dollarsToCents(dollars: string | number): number {
  const amount = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  return Math.round(amount * 100);
}

// Convert cents to dollars (e.g., 4999 -> "49.99")
export function centsToDollars(cents: number | undefined): string {
  return ((cents || 0) / 100).toString();
}

// Zod schema for price input (converts dollar input to cents)
export const priceSchema = z.string().transform((val) => {
  const dollars = parseFloat(val);
  if (isNaN(dollars)) return "0";
  return dollarsToCents(dollars).toString();
});

export const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Congo-Brazzaville)",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor (Timor-Leste)",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar (formerly Burma)",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

export const customStyles = "text-gray-300 placeholder:text-gray-500";

export function convertToSubCurrency(amount: number, factor = 100) {
  return Math.round(amount * factor);
}

export const NAVBAR_HEIGHT = 48;

export const courseCategories = [
  { value: "technology", label: "Technology" },
  { value: "science", label: "Science" },
  { value: "mathematics", label: "Mathematics" },
  { value: "artificial-intelligence", label: "Artificial Intelligence" },
] as const;

export const customDataGridStyles = {
  border: "none",
  backgroundColor: "#17181D",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#1B1C22",
    color: "#6e6e6e",
    "& [role='row'] > *": {
      backgroundColor: "#1B1C22 !important",
      border: "none !important",
    },
  },
  "& .MuiDataGrid-cell": {
    color: "#6e6e6e",
    border: "none !important",
  },
  "& .MuiDataGrid-row": {
    backgroundColor: "#17181D",
    "&:hover": {
      backgroundColor: "#25262F",
    },
  },
  "& .MuiDataGrid-footerContainer": {
    backgroundColor: "#17181D",
    color: "#6e6e6e",
    border: "none !important",
  },
  "& .MuiDataGrid-filler": {
    border: "none !important",
    backgroundColor: "#17181D !important",
    borderTop: "none !important",
    "& div": {
      borderTop: "none !important",
    },
  },
  "& .MuiTablePagination-root": {
    color: "#6e6e6e",
  },
  "& .MuiTablePagination-actions .MuiIconButton-root": {
    color: "#6e6e6e",
  },
};

export const createCourseFormData = (
  data: CourseFormData,
  sections: Section[]
): FormData => {
  console.log('📦 createCourseFormData 시작:');
  console.log('  - 입력 데이터:', data);
  console.log('  - 섹션 수:', sections.length);
  
  const formData = new FormData();
  
  // 기본 필드들 추가
  formData.append("title", data.courseTitle || '');
  formData.append("description", data.courseDescription || '');
  formData.append("category", data.courseCategory || '');
  
  // 가격 필드 처리 (달러를 센트로 변환)
  const priceInCents = dollarsToCents(data.coursePrice || '0');
  formData.append("price", priceInCents.toString());
  console.log('💰 가격 변환:', data.coursePrice, '->', priceInCents);
  
  // 상태 필드 처리
  const status = data.courseStatus ? "Published" : "Draft";
  formData.append("status", status);
  console.log('📊 상태 설정:', status);

  // 섹션 데이터 처리
  const sectionsWithVideos = sections.map((section) => {
    console.log(`📂 섹션 처리: ${section.sectionTitle} (${section.chapters.length}개 챕터)`);
    
    return {
      ...section,
      chapters: section.chapters.map((chapter) => {
        console.log(`  📄 챕터 처리: ${chapter.title} (비디오: ${chapter.video ? '있음' : '없음'})`);
        
        return {
          ...chapter,
          video: chapter.video,
        };
      }),
    };
  });

  formData.append("sections", JSON.stringify(sectionsWithVideos));
  console.log('📋 섹션 데이터 JSON 추가 완료');
  console.log('✅ FormData 생성 완료');

  return formData;
};

// FormData 내용을 로그로 출력하는 헬퍼 함수
export const logFormData = (formData: FormData, title: string = 'FormData') => {
  console.log(`📋 ${title} 내용:`);
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      console.log(`  ${key}: ${value.length > 100 ? value.substring(0, 100) + '...' : value}`);
    } else {
      console.log(`  ${key}: [File] ${(value as File).name}`);
    }
  }
};

export const uploadAllVideos = async (
  localSections: Section[],
  courseId: string,
  getUploadVideoUrl: any
) => {
  console.log('📹 uploadAllVideos 시작:');
  console.log(`  - 강의 ID: ${courseId}`);
  console.log(`  - 섹션 수: ${localSections.length}`);
  
  const updatedSections = localSections.map((section) => ({
    ...section,
    chapters: section.chapters.map((chapter) => ({
      ...chapter,
    })),
  }));

  let totalVideos = 0;
  let uploadedVideos = 0;
  
  // 전체 비디오 파일 수 계산
  for (const section of updatedSections) {
    for (const chapter of section.chapters) {
      if (chapter.video instanceof File && chapter.video.type === "video/mp4") {
        totalVideos++;
      }
    }
  }
  
  console.log(`📋 업로드할 비디오 파일: ${totalVideos}개`);
  
  if (totalVideos === 0) {
    console.log('ℹ️ 업로드할 비디오 파일이 없습니다.');
    return updatedSections;
  }

  for (let i = 0; i < updatedSections.length; i++) {
    const section = updatedSections[i];
    console.log(`📂 섹션 처리: ${section.sectionTitle} (${section.sectionId})`);
    
    for (let j = 0; j < section.chapters.length; j++) {
      const chapter = section.chapters[j];
      
      if (chapter.video instanceof File && chapter.video.type === "video/mp4") {
        console.log(`  📹 챕터 "${chapter.title}" 비디오 업로드 시작...`);
        console.log(`    - 파일명: ${chapter.video.name}`);
        console.log(`    - 파일 크기: ${(chapter.video.size / 1024 / 1024).toFixed(2)}MB`);
        
        try {
          const updatedChapter = await uploadVideo(
            chapter,
            courseId,
            section.sectionId,
            getUploadVideoUrl
          );
          updatedSections[i].chapters[j] = updatedChapter;
          uploadedVideos++;
          
          console.log(`  ✅ 챕터 "${chapter.title}" 비디오 업로드 성공! (${uploadedVideos}/${totalVideos})`);
        } catch (error: any) {
          console.error(`  ❌ 챕터 "${chapter.title}" 비디오 업로드 실패:`, error);
          console.error(`    - 에러 메시지: ${error?.message || 'Unknown error'}`);
          // 업로드에 실패해도 계속 진행
        }
      } else if (chapter.video) {
        console.log(`  ℹ️ 챕터 "${chapter.title}": 비디오가 이미 URL이거나 비디오 파일이 아님`);
      }
    }
  }
  
  console.log(`✅ uploadAllVideos 완료: ${uploadedVideos}/${totalVideos}개 비디오 업로드 성공`);
  return updatedSections;
};

async function uploadVideo(
  chapter: Chapter,
  courseId: string,
  sectionId: string,
  getUploadVideoUrl: any
) {
  const file = chapter.video as File;
  console.log(`🚀 uploadVideo 시작: ${chapter.title}`);

  try {
    console.log(`  🔗 업로드 URL 요청 중...`);
    const { uploadUrl, videoUrl } = await getUploadVideoUrl({
      courseId,
      sectionId,
      chapterId: chapter.chapterId,
      fileName: file.name,
      fileType: file.type,
    }).unwrap();
    
    console.log(`  ✅ 업로드 URL 수신 성공`);
    console.log(`  📤 파일 업로드 시작... (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`파일 업로드 실패: HTTP ${uploadResponse.status}`);
    }
    
    console.log(`  ✅ 파일 업로드 성공!`);
    
    toast.success(
      `챕터 "${chapter.title}" 비디오 업로드 성공`
    );

    return { ...chapter, video: videoUrl };
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    console.error(`❌ uploadVideo 실패 (${chapter.title}):`, errorMessage);
    
    toast.error(
      `챕터 "${chapter.title}" 비디오 업로드 실패: ${errorMessage}`
    );
    
    throw error;
  }
}
