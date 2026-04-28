"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCreator, requireUser, isAdminRole } from "@/lib/rbac";
import { calculateCourseProgress } from "@/lib/course-progress";
import { findNextLessonId, getOrderedCourseLessons } from "@/lib/course-navigation";
import { upsertLessonCompletionCompat } from "@/lib/lesson-completion-compat";
import { sendCertificateEmail } from "@/lib/mail";

function generateCertificateNumber(courseId, userId) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const coursePart = String(courseId).slice(-6).toUpperCase();
  const userPart = String(userId).slice(-6).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CERT-${datePart}-${coursePart}-${userPart}-${randomPart}`;
}

async function requireCourseOwner(courseId, auth) {
  if (isAdminRole(auth.role)) return { ok: true };
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, authorId: true },
  });
  if (!course) return { ok: false, error: "Nie znaleziono kursu." };
  if (course.authorId !== auth.userId) return { ok: false, error: "Brak uprawnień do tego kursu." };
  return { ok: true };
}

async function requireModuleOwner(moduleId, auth) {
  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { id: true, courseId: true, course: { select: { authorId: true } } },
  });
  if (!moduleRecord) return { ok: false, error: "Nie znaleziono modułu." };
  if (!isAdminRole(auth.role) && moduleRecord.course?.authorId !== auth.userId) {
    return { ok: false, error: "Brak uprawnień do tego modułu." };
  }
  return { ok: true, moduleRecord };
}

async function requireLessonOwner(lessonId, auth) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      moduleId: true,
      module: { select: { courseId: true, course: { select: { authorId: true } } } },
    },
  });
  if (!lesson) return { ok: false, error: "Nie znaleziono lekcji." };
  if (!isAdminRole(auth.role) && lesson.module?.course?.authorId !== auth.userId) {
    return { ok: false, error: "Brak uprawnień do tej lekcji." };
  }
  return { ok: true, lesson };
}

function normalizeString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeOptionalString(value) {
  const v = normalizeString(value);
  return v.length ? v : null;
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeInt(value, fallback = 1) {
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

// =========================
// Course
// =========================

export async function getCourses() {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return [];
    return await prisma.course.findMany({
      where: isAdminRole(auth.role) ? {} : { authorId: auth.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { modules: true, enrollments: true } },
      },
    });
  } catch (error) {
    console.error("getCourses:", error);
    return [];
  }
}

export async function createCourse(input) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    const title = normalizeString(input?.title);
    const description = normalizeOptionalString(input?.description);
    const price = normalizeOptionalNumber(input?.price);
    const isPublished = Boolean(input?.isPublished);

    if (!title) {
      return { success: false, error: "Tytuł kursu jest wymagany." };
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        price,
        isPublished,
        authorId: auth.userId,
      },
    });

    revalidatePath("/dashboard/kursy");
    return { success: true, course };
  } catch (error) {
    console.error("createCourse:", error);
    return { success: false, error: "Nie udało się utworzyć kursu." };
  }
}

export async function updateCourse(courseId, input) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!courseId || typeof courseId !== "string") {
      return { success: false, error: "Nieprawidłowe ID kursu." };
    }

    const own = await requireCourseOwner(courseId, auth);
    if (!own.ok) return { success: false, error: own.error };

    const title = normalizeString(input?.title);
    const description = normalizeOptionalString(input?.description);
    const price = normalizeOptionalNumber(input?.price);
    const isPublished = Boolean(input?.isPublished);

    if (!title) {
      return { success: false, error: "Tytuł kursu jest wymagany." };
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        title,
        description,
        price,
        isPublished,
      },
    });

    revalidatePath("/dashboard/kursy");
    revalidatePath(`/dashboard/kursy/${courseId}`);
    return { success: true, course };
  } catch (error) {
    console.error("updateCourse:", error);
    return { success: false, error: "Nie udało się zaktualizować kursu." };
  }
}

export async function deleteCourse(courseId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!courseId || typeof courseId !== "string") {
      return { success: false, error: "Nieprawidłowe ID kursu." };
    }

    const own = await requireCourseOwner(courseId, auth);
    if (!own.ok) return { success: false, error: own.error };

    await prisma.course.delete({ where: { id: courseId } });

    revalidatePath("/dashboard/kursy");
    return { success: true };
  } catch (error) {
    console.error("deleteCourse:", error);
    return { success: false, error: "Nie udało się usunąć kursu." };
  }
}

// =========================
// Module
// =========================

export async function getModulesByCourse(courseId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return [];
    if (!courseId || typeof courseId !== "string") return [];
    const own = await requireCourseOwner(courseId, auth);
    if (!own.ok) return [];
    return await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: { _count: { select: { lessons: true } } },
    });
  } catch (error) {
    console.error("getModulesByCourse:", error);
    return [];
  }
}

export async function createModule(courseId, input) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!courseId || typeof courseId !== "string") {
      return { success: false, error: "Nieprawidłowe ID kursu." };
    }
    const own = await requireCourseOwner(courseId, auth);
    if (!own.ok) return { success: false, error: own.error };

    const title = normalizeString(input?.title);
    const order = normalizeInt(input?.order, 1);
    const unlockDaysAfterEnrollment = Math.max(0, normalizeInt(input?.unlockDaysAfterEnrollment, 0));

    if (!title) {
      return { success: false, error: "Tytuł modułu jest wymagany." };
    }

    const moduleRecord = await prisma.module.create({
      data: {
        title,
        order,
        unlockDaysAfterEnrollment,
        courseId,
      },
    });

    revalidatePath(`/dashboard/kursy/${courseId}`);
    return { success: true, module: moduleRecord };
  } catch (error) {
    console.error("createModule:", error);
    return { success: false, error: "Nie udało się utworzyć modułu." };
  }
}

export async function updateModule(moduleId, input) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!moduleId || typeof moduleId !== "string") {
      return { success: false, error: "Nieprawidłowe ID modułu." };
    }
    const own = await requireModuleOwner(moduleId, auth);
    if (!own.ok) return { success: false, error: own.error };

    const title = normalizeString(input?.title);
    const order = normalizeInt(input?.order, 1);
    const unlockDaysAfterEnrollment = Math.max(0, normalizeInt(input?.unlockDaysAfterEnrollment, 0));

    if (!title) {
      return { success: false, error: "Tytuł modułu jest wymagany." };
    }

    const moduleRecord = await prisma.module.update({
      where: { id: moduleId },
      data: { title, order, unlockDaysAfterEnrollment },
      select: { id: true, courseId: true, title: true, order: true, unlockDaysAfterEnrollment: true },
    });

    revalidatePath(`/dashboard/kursy/${moduleRecord.courseId}`);
    return { success: true, module: moduleRecord };
  } catch (error) {
    console.error("updateModule:", error);
    return { success: false, error: "Nie udało się zaktualizować modułu." };
  }
}

export async function deleteModule(moduleId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!moduleId || typeof moduleId !== "string") {
      return { success: false, error: "Nieprawidłowe ID modułu." };
    }

    const own = await requireModuleOwner(moduleId, auth);
    if (!own.ok) return { success: false, error: own.error };

    await prisma.module.delete({ where: { id: moduleId } });

    if (own.moduleRecord?.courseId) {
      revalidatePath(`/dashboard/kursy/${own.moduleRecord.courseId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("deleteModule:", error);
    return { success: false, error: "Nie udało się usunąć modułu." };
  }
}

// =========================
// Lesson
// =========================

export async function getLessonsByModule(moduleId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return [];
    if (!moduleId || typeof moduleId !== "string") return [];
    const own = await requireModuleOwner(moduleId, auth);
    if (!own.ok) return [];
    return await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
      include: {
        resources: { orderBy: { order: "asc" } },
        questions: { orderBy: { order: "asc" } },
      },
    });
  } catch (error) {
    console.error("getLessonsByModule:", error);
    return [];
  }
}

export async function createLesson(moduleId, input) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!moduleId || typeof moduleId !== "string") {
      return { success: false, error: "Nieprawidłowe ID modułu." };
    }
    const own = await requireModuleOwner(moduleId, auth);
    if (!own.ok) return { success: false, error: own.error };

    const title = normalizeString(input?.title);
    const order = normalizeInt(input?.order, 1);
    const videoUrl = normalizeOptionalString(input?.videoUrl);
    const videoText = normalizeOptionalString(input?.videoText);
    const content = normalizeOptionalString(input?.content);
    const resources = Array.isArray(input?.resources) ? input.resources : [];
    const questions = Array.isArray(input?.questions) ? input.questions : [];

    if (!title) {
      return { success: false, error: "Tytuł lekcji jest wymagany." };
    }

    const moduleRecord = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });

    const lesson = await prisma.lesson.create({
      data: {
        title,
        order,
        videoUrl,
        videoText,
        content,
        moduleId,
        resources: {
          create: resources
            .map((r, idx) => ({
              type: r?.type === "PDF" ? "PDF" : "LINK",
              title: normalizeString(r?.title) || (r?.type === "PDF" ? "PDF" : "Link"),
              url: normalizeString(r?.url),
              order: normalizeInt(r?.order, idx + 1),
            }))
            .filter((r) => Boolean(r.url)),
        },
        questions: {
          create: questions
            .map((q, idx) => ({
              type: q?.type === "MULTIPLE_CHOICE_ABC" ? "MULTIPLE_CHOICE_ABC" : "OPEN_TEXT",
              question: normalizeString(q?.question),
              answer: normalizeOptionalString(q?.answer),
              optionA: normalizeOptionalString(q?.optionA),
              optionB: normalizeOptionalString(q?.optionB),
              optionC: normalizeOptionalString(q?.optionC),
              correctOption:
                q?.type === "MULTIPLE_CHOICE_ABC"
                  ? normalizeOptionalString(q?.correctOption)
                  : null,
              order: normalizeInt(q?.order, idx + 1),
              createdById: auth.userId,
            }))
            .filter((q) => Boolean(q.question)),
        },
      },
      include: {
        resources: { orderBy: { order: "asc" } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (moduleRecord?.courseId) {
      revalidatePath(`/dashboard/kursy/${moduleRecord.courseId}`);
    }
    return { success: true, lesson };
  } catch (error) {
    console.error("createLesson:", error);
    return { success: false, error: "Nie udało się utworzyć lekcji." };
  }
}

export async function updateLesson(lessonId, input) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!lessonId || typeof lessonId !== "string") {
      return { success: false, error: "Nieprawidłowe ID lekcji." };
    }
    const own = await requireLessonOwner(lessonId, auth);
    if (!own.ok) return { success: false, error: own.error };

    const title = normalizeString(input?.title);
    const order = normalizeInt(input?.order, 1);
    const videoUrl = normalizeOptionalString(input?.videoUrl);
    const videoText = normalizeOptionalString(input?.videoText);
    const content = normalizeOptionalString(input?.content);
    const resources = Array.isArray(input?.resources) ? input.resources : [];
    const questions = Array.isArray(input?.questions) ? input.questions : [];

    if (!title) {
      return { success: false, error: "Tytuł lekcji jest wymagany." };
    }

    const existing = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { moduleId: true },
    });

    const lesson = await prisma.$transaction(async (tx) => {
      await tx.lessonResource.deleteMany({ where: { lessonId } });
      await tx.lessonQuestion.deleteMany({ where: { lessonId } });
      return await tx.lesson.update({
        where: { id: lessonId },
        data: {
          title,
          order,
          videoUrl,
          videoText,
          content,
          resources: {
            create: resources
              .map((r, idx) => ({
                type: r?.type === "PDF" ? "PDF" : "LINK",
                title: normalizeString(r?.title) || (r?.type === "PDF" ? "PDF" : "Link"),
                url: normalizeString(r?.url),
                order: normalizeInt(r?.order, idx + 1),
              }))
              .filter((r) => Boolean(r.url)),
          },
          questions: {
            create: questions
              .map((q, idx) => ({
                type: q?.type === "MULTIPLE_CHOICE_ABC" ? "MULTIPLE_CHOICE_ABC" : "OPEN_TEXT",
                question: normalizeString(q?.question),
                answer: normalizeOptionalString(q?.answer),
                optionA: normalizeOptionalString(q?.optionA),
                optionB: normalizeOptionalString(q?.optionB),
                optionC: normalizeOptionalString(q?.optionC),
                correctOption:
                  q?.type === "MULTIPLE_CHOICE_ABC"
                    ? normalizeOptionalString(q?.correctOption)
                    : null,
                order: normalizeInt(q?.order, idx + 1),
                createdById: auth.userId,
              }))
              .filter((q) => Boolean(q.question)),
          },
        },
        include: {
          resources: { orderBy: { order: "asc" } },
          questions: { orderBy: { order: "asc" } },
        },
      });
    });

    if (existing?.moduleId) {
      const moduleRecord = await prisma.module.findUnique({
        where: { id: existing.moduleId },
        select: { courseId: true },
      });
      if (moduleRecord?.courseId)
        revalidatePath(`/dashboard/kursy/${moduleRecord.courseId}`);
    }

    return { success: true, lesson };
  } catch (error) {
    console.error("updateLesson:", error);
    return { success: false, error: "Nie udało się zaktualizować lekcji." };
  }
}

export async function deleteLesson(lessonId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!lessonId || typeof lessonId !== "string") {
      return { success: false, error: "Nieprawidłowe ID lekcji." };
    }
    const own = await requireLessonOwner(lessonId, auth);
    if (!own.ok) return { success: false, error: own.error };

    const existing = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { moduleId: true },
    });

    await prisma.lesson.delete({ where: { id: lessonId } });

    if (existing?.moduleId) {
      const moduleRecord = await prisma.module.findUnique({
        where: { id: existing.moduleId },
        select: { courseId: true },
      });
      if (moduleRecord?.courseId)
        revalidatePath(`/dashboard/kursy/${moduleRecord.courseId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("deleteLesson:", error);
    return { success: false, error: "Nie udało się usunąć lekcji." };
  }
}

export async function getStudentCertificateProgress(courseId) {
  try {
    const auth = await requireUser();
    if (!auth.ok || !auth.userId) {
      return { success: true, shouldRender: false };
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true },
    });

    if (!courseId || typeof courseId !== "string") {
      const latestCertificate = await prisma.certificate.findFirst({
        where: { userId: auth.userId },
        orderBy: { issueDate: "desc" },
        select: {
          id: true,
          certificateNumber: true,
          issueDate: true,
          course: { select: { title: true } },
        },
      });

      if (latestCertificate) {
        return {
          success: true,
          shouldRender: true,
          progress: 100,
          completedLessons: 0,
          totalLessons: 0,
          isCompleted: true,
          certificate: {
            id: latestCertificate.id,
            certificateNumber: latestCertificate.certificateNumber,
            issueDate: latestCertificate.issueDate,
          },
          courseTitle: latestCertificate.course?.title || "Kurs",
          studentName: user?.name || user?.email || "Uczestnik kursu",
        };
      }

      const mostAdvancedEnrollment = await prisma.enrollment.findFirst({
        where: { userId: auth.userId },
        orderBy: { progress: "desc" },
        select: {
          progress: true,
          course: { select: { title: true } },
        },
      });

      return {
        success: true,
        shouldRender: true,
        progress: mostAdvancedEnrollment?.progress ?? 0,
        completedLessons: 0,
        totalLessons: 0,
        isCompleted: false,
        certificate: null,
        courseTitle: mostAdvancedEnrollment?.course?.title || "",
        studentName: user?.name || user?.email || "Uczestnik kursu",
      };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: auth.userId, courseId } },
      select: { id: true, progress: true },
    });

    if (!enrollment) {
      return { success: true, shouldRender: false };
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        modules: {
          select: {
            id: true,
            lessons: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!course) {
      return { success: true, shouldRender: false };
    }

    const totalLessons = (course.modules ?? []).reduce(
      (sum, moduleRecord) => sum + (moduleRecord.lessons?.length ?? 0),
      0
    );
    const completedLessons = await prisma.lessonCompletion.count({
      where: { enrollmentId: enrollment.id },
    });
    const progress = calculateCourseProgress(completedLessons, totalLessons);

    const certificate = await prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId: auth.userId,
          courseId,
        },
      },
      select: {
        id: true,
        certificateNumber: true,
        issueDate: true,
      },
    });

    return {
      success: true,
      shouldRender: true,
      progress,
      completedLessons,
      totalLessons,
      isCompleted: progress === 100,
      certificate,
      courseTitle: course.title,
      studentName: user?.name || user?.email || "Uczestnik kursu",
    };
  } catch (error) {
    console.error("getStudentCertificateProgress:", error);
    return { success: false, shouldRender: false, error: "Nie udało się pobrać progresu." };
  }
}

export async function completeLessonAndProceed({ courseId, lessonId }) {
  try {
    const auth = await requireUser();
    if (!auth.ok || !auth.userId) return { success: false, error: auth.error };
    const userId = auth.userId;
    if (!courseId || !lessonId) {
      return { success: false, error: "Brak wymaganych danych lekcji lub kursu." };
    }

    const [courseData, enrollment, user] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          title: true,
          modules: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              lessons: {
                orderBy: { order: "asc" },
                select: { id: true, order: true },
              },
            },
          },
        },
      }),
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      }),
    ]);

    if (!courseData || !enrollment) {
      return { success: false, error: "Nie znaleziono kursu lub zapisu użytkownika." };
    }

    const orderedLessons = getOrderedCourseLessons(courseData.modules);
    const lessonExists = orderedLessons.some((lesson) => lesson.id === lessonId);
    if (!lessonExists) {
      return { success: false, error: "Lekcja nie należy do wskazanego kursu." };
    }

    const totalLessons = orderedLessons.length;
    const nextLessonId = findNextLessonId(orderedLessons, lessonId);

    await upsertLessonCompletionCompat(prisma, enrollment.id, lessonId);

    const result = await prisma.$transaction(async (tx) => {
      const completedLessons = await tx.lessonCompletion.count({
        where: { enrollmentId: enrollment.id },
      });

      const progress = calculateCourseProgress(completedLessons, totalLessons);

      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { progress },
      });

      let certificate = await tx.certificate.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: {
          id: true,
          certificateNumber: true,
          issueDate: true,
        },
      });
      let certificateCreated = false;

      if (progress === 100 && !certificate) {
        certificate = await tx.certificate.create({
          data: {
            userId,
            courseId,
            certificateNumber: generateCertificateNumber(courseId, userId),
          },
          select: {
            id: true,
            certificateNumber: true,
            issueDate: true,
          },
        });
        certificateCreated = true;
      }

      return { progress, certificate, certificateCreated };
    });

    revalidatePath(`/student/kurs/${courseId}`);
    revalidatePath("/student");

    if (result.certificateCreated && result.certificate && user?.email) {
      await sendCertificateEmail({
        to: user.email,
        studentName: user.name || user.email,
        courseName: courseData.title,
        issueDate: result.certificate.issueDate,
        certificateNumber: result.certificate.certificateNumber,
      });
    }

    if (nextLessonId) {
      return {
        success: true,
        progress: result.progress,
        nextLessonId,
        redirectUrl: `/student/kurs/${courseId}?lessonId=${nextLessonId}`,
      };
    }

    return {
      success: true,
      progress: result.progress,
      nextLessonId: null,
      redirectUrl: `/student/kurs/${courseId}?certificate=1`,
    };
  } catch (error) {
    console.error("completeLessonAndProceed:", error);
    return { success: false, error: "Nie udało się zapisać postępu lekcji." };
  }
}

