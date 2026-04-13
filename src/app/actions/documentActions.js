"use server";

import { prisma } from "@/lib/prisma";
import { requireCreatorOrAdmin, isAdminRole } from "@/lib/rbac";

export async function listDocuments() {
  const auth = await requireCreatorOrAdmin();
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

