"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireCreator, isAdminRole } from "@/lib/rbac";

export async function listDocuments() {
  const auth = await requireCreator();
  if (!auth.ok) return [];

  return prisma.document.findMany({
    where: isAdminRole(auth.role) ? {} : { lead: { ownerId: auth.userId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      isSigned: true,
      signedAt: true,
      createdAt: true,
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

export async function uploadDocument(formData) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    const title = String(formData.get("title") || "").trim();
    const leadId = String(formData.get("leadId") || "").trim();
    const file = formData.get("file");

    if (!title || !leadId) {
      return { success: false, error: "Tytuł i lead są wymagane." };
    }

    if (!file || typeof file === "string") {
      return { success: false, error: "Wybierz plik PDF lub HTML." };
    }

    const originalName = String(file.name || "document").trim();
    const safeName = path.basename(originalName).replace(/[^\w.-]/g, "_");
    const extension = path.extname(safeName).toLowerCase();
    if (![".pdf", ".html", ".htm"].includes(extension)) {
      return { success: false, error: "Dozwolone są tylko pliki PDF i HTML." };
    }

    const lead = await prisma.lead.findFirst({
      where: isAdminRole(auth.role) ? { id: leadId } : { id: leadId, ownerId: auth.userId },
      select: { id: true },
    });
    if (!lead) {
      return { success: false, error: "Lead nie istnieje lub nie masz do niego dostępu." };
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "documents");
    await mkdir(uploadsDir, { recursive: true });

    const uniqueFileName = `${Date.now()}-${safeName || "document" + extension}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    const fileUrl = `/uploads/documents/${uniqueFileName}`;
    const document = await prisma.document.create({
      data: {
        title,
        fileUrl,
        leadId,
        isSigned: false,
      },
    });

    revalidatePath("/dashboard/dokumenty");
    return { success: true, document };
  } catch (error) {
    console.error("uploadDocument:", error);
    return { success: false, error: "Nie udało się zapisać dokumentu." };
  }
}

