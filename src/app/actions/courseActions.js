"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

async function requireCreator() {
  // DEV bypass: allow testing without login/roles.
  if (process.env.NODE_ENV !== "production") {
    return { ok: true, session: null, bypass: true };
  }
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "KREATOR") {
    return { ok: false, error: "Brak uprawnień. Ta akcja jest dostępna tylko dla kreatora." };
  }
  return { ok: true, session };
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

    const title = normalizeString(input?.title);
    const order = normalizeInt(input?.order, 1);

    if (!title) {
      return { success: false, error: "Tytuł modułu jest wymagany." };
    }

    const moduleRecord = await prisma.module.create({
      data: {
        title,
        order,
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

    const title = normalizeString(input?.title);
    const order = normalizeInt(input?.order, 1);

    if (!title) {
      return { success: false, error: "Tytuł modułu jest wymagany." };
    }

    const moduleRecord = await prisma.module.update({
      where: { id: moduleId },
      data: { title, order },
      select: { id: true, courseId: true, title: true, order: true },
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

    const existing = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });

    await prisma.module.delete({ where: { id: moduleId } });

    if (existing?.courseId) {
      revalidatePath(`/dashboard/kursy/${existing.courseId}`);
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
    return await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
      include: { resources: { orderBy: { order: "asc" } } },
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

    const title = normalizeString(input?.title);
    const order = normalizeInt(input?.order, 1);
    const videoUrl = normalizeOptionalString(input?.videoUrl);
    const videoText = normalizeOptionalString(input?.videoText);
    const content = normalizeOptionalString(input?.content);
    const resources = Array.isArray(input?.resources) ? input.resources : [];

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
      },
      include: { resources: { orderBy: { order: "asc" } } },
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

    const title = normalizeString(input?.title);
    const order = normalizeInt(input?.order, 1);
    const videoUrl = normalizeOptionalString(input?.videoUrl);
    const videoText = normalizeOptionalString(input?.videoText);
    const content = normalizeOptionalString(input?.content);
    const resources = Array.isArray(input?.resources) ? input.resources : [];

    if (!title) {
      return { success: false, error: "Tytuł lekcji jest wymagany." };
    }

    const existing = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { moduleId: true },
    });

    const lesson = await prisma.$transaction(async (tx) => {
      await tx.lessonResource.deleteMany({ where: { lessonId } });
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
        },
        include: { resources: { orderBy: { order: "asc" } } },
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

