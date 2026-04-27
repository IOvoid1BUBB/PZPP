"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireCreator, requireStudentOrAdmin, isAdminRole, Roles } from "@/lib/rbac";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

const PRIVATE_DOCS_DIR = path.join(process.cwd(), "storage", "documents");

function isPdfPath(p) {
  return String(p || "").toLowerCase().endsWith(".pdf");
}

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
      requiresSignature: true,
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

export async function listStudentDocuments() {
  const auth = await requireStudentOrAdmin();
  if (!auth.ok) return [];

  if (isAdminRole(auth.role)) {
    return prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        requiresSignature: true,
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

  if (auth.role !== Roles.UCZESTNIK) return [];

  const email = auth.session?.user?.email ?? null;
  if (!email) return [];

  return prisma.document.findMany({
    where: {
      lead: {
        email: { equals: String(email), mode: "insensitive" },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      requiresSignature: true,
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

export async function getStudentDocument(documentId) {
  const auth = await requireStudentOrAdmin();
  if (!auth.ok) return null;

  if (!documentId || typeof documentId !== "string") return null;

  if (isAdminRole(auth.role)) {
    return prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        requiresSignature: true,
        isSigned: true,
        signature: true,
        signedAt: true,
        createdAt: true,
        lead: { select: { id: true, ownerId: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  if (auth.role !== Roles.UCZESTNIK) return null;
  const email = auth.session?.user?.email ?? null;
  if (!email) return null;

  return prisma.document.findFirst({
    where: {
      id: documentId,
      lead: { email: { equals: String(email), mode: "insensitive" } },
    },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      requiresSignature: true,
      isSigned: true,
      signature: true,
      signedAt: true,
      createdAt: true,
      lead: { select: { id: true, ownerId: true, email: true, firstName: true, lastName: true } },
    },
  });
}

export async function signStudentDocument(documentId, signatureDataUrl) {
  try {
    const auth = await requireStudentOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!documentId || typeof documentId !== "string") {
      return { success: false, error: "Nieprawidłowe ID dokumentu." };
    }
    if (!signatureDataUrl || typeof signatureDataUrl !== "string") {
      return { success: false, error: "Brak podpisu." };
    }
    if (!signatureDataUrl.startsWith("data:image/")) {
      return { success: false, error: "Nieprawidłowy format podpisu." };
    }
    // Basic size guard (~500KB base64 string)
    if (signatureDataUrl.length > 700_000) {
      return { success: false, error: "Podpis jest zbyt duży. Spróbuj podpisać się krócej." };
    }

    const email = auth.session?.user?.email ?? null;
    if (auth.role === Roles.UCZESTNIK && !email) {
      return { success: false, error: "Brak e-maila w sesji." };
    }

    const doc = await prisma.document.findFirst({
      where: isAdminRole(auth.role)
        ? { id: documentId }
        : {
            id: documentId,
            lead: { email: { equals: String(email), mode: "insensitive" } },
          },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        requiresSignature: true,
        isSigned: true,
        lead: { select: { id: true, ownerId: true, email: true } },
      },
    });

    if (!doc) return { success: false, error: "Nie znaleziono dokumentu lub brak dostępu." };
    if (!doc.requiresSignature) {
      return { success: false, error: "Ten dokument nie wymaga podpisu." };
    }
    if (doc.isSigned) {
      return { success: false, error: "Dokument jest już podpisany." };
    }
    if (!String(doc.fileUrl || "").toLowerCase().endsWith(".pdf")) {
      return { success: false, error: "Podpis jest dostępny tylko dla plików PDF." };
    }

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        signature: signatureDataUrl,
        isSigned: true,
        signedAt: new Date(),
      },
      select: { id: true, isSigned: true, signedAt: true },
    });

    if (doc.lead?.ownerId) {
      const who = email || "Uczeń";
      await createNotification({
        userId: doc.lead.ownerId,
        type: NOTIFICATION_TYPES.DOCUMENT_SIGNED,
        title: "Dokument podpisany",
        body: `${who}: ${doc.title}`,
        url: `/dashboard/dokumenty`,
        entityId: doc.id,
      }).catch(() => null);
    }

    revalidatePath("/student/pliki");
    revalidatePath(`/student/pliki/${doc.id}`);
    revalidatePath("/dashboard/dokumenty");

    return { success: true, document: updated };
  } catch (error) {
    console.error("signStudentDocument:", error);
    return { success: false, error: "Nie udało się zapisać podpisu." };
  }
}

export async function uploadDocument(formData) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    const title = String(formData.get("title") || "").trim();
    const leadId = String(formData.get("leadId") || "").trim();
    const requiresSignatureRaw = formData.get("requiresSignature");
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

    const requiresSignature =
      requiresSignatureRaw === "on" ||
      requiresSignatureRaw === "true" ||
      requiresSignatureRaw === "1";
    if (requiresSignature && extension !== ".pdf") {
      return { success: false, error: "Podpis jest dostępny tylko dla plików PDF." };
    }

    const lead = await prisma.lead.findFirst({
      where: isAdminRole(auth.role) ? { id: leadId } : { id: leadId, ownerId: auth.userId },
      select: { id: true },
    });
    if (!lead) {
      return { success: false, error: "Lead nie istnieje lub nie masz do niego dostępu." };
    }

    await mkdir(PRIVATE_DOCS_DIR, { recursive: true });

    const uniqueFileName = `${Date.now()}-${safeName || "document" + extension}`;
    const filePath = path.join(PRIVATE_DOCS_DIR, uniqueFileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    // Store a private storage key (not a public URL).
    const fileUrl = `documents/${uniqueFileName}`;
    const document = await prisma.document.create({
      data: {
        title,
        fileUrl,
        leadId,
        requiresSignature,
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

