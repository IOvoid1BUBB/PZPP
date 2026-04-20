import crypto from "crypto";
import bcrypt from "bcryptjs";
import { render } from "@react-email/render";
import React from "react";

import { prisma } from "@/lib/prisma";
import { transporter, mailOptions } from "@/lib/nodemailer";
import CourseEnrollmentConfirmation, {
  getSubject as getCourseEnrollmentConfirmationSubject,
} from "@/emails/templates/CourseEnrollmentConfirmation";

function generateTemporaryPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

function generateTemporaryNickname() {
  return `uczen-${crypto.randomBytes(3).toString("hex")}`;
}

export async function provisionPaidCheckout(params: {
  stripeSessionId: string;
  courseId: string;
  customerEmail: string;
  customerName?: string | null;
  amountTotal?: number | null;
  platformUrl: string;
}) {
  const { stripeSessionId, courseId, customerEmail, customerName, amountTotal, platformUrl } = params;

  const result = await prisma.$transaction(async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) {
      throw new Error(`Course not found: ${courseId}`);
    }

    let user = await tx.user.findUnique({
      where: { email: customerEmail },
      select: { id: true, name: true, email: true },
    });
    let userCreated = false;

    let temporaryPassword: string | null = null;
    let temporaryNickname: string | null = null;

    if (!user) {
      temporaryPassword = generateTemporaryPassword();
      temporaryNickname = generateTemporaryNickname();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

      user = await tx.user.create({
        data: {
          email: customerEmail,
          name: customerName || temporaryNickname,
          password: hashedPassword,
          role: "UCZESTNIK",
        },
        select: { id: true, name: true, email: true },
      });
      userCreated = true;
    }

    const order = await tx.order.findUnique({
      where: { stripeSessionId },
      select: { stripeSessionId: true, status: true, userId: true, courseId: true },
    });

    if (!order) {
      await tx.order.create({
        data: {
          stripeSessionId,
          amount: amountTotal ?? 0,
          status: "COMPLETED",
          userId: user.id,
          courseId: course.id,
        },
      });
    } else if (order.status !== "COMPLETED") {
      await tx.order.update({
        where: { stripeSessionId },
        data: { status: "COMPLETED", userId: order.userId ?? user.id },
      });
    } else if (!order.userId) {
      await tx.order.update({
        where: { stripeSessionId },
        data: { userId: user.id },
      });
    }

    const existingEnrollment = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      select: { id: true },
    });

    if (!existingEnrollment) {
      await tx.enrollment.create({
        data: { userId: user.id, courseId: course.id, progress: 0 },
      });
    }

    return {
      toEmail: customerEmail,
      userName: (user.name || customerName || temporaryNickname) ?? undefined,
      courseTitle: course.title,
      loginEmail: customerEmail,
      temporaryPassword,
      temporaryNickname,
      userCreated,
      enrollmentCreated: !existingEnrollment,
    };
  });

  try {
    const props = {
      userName: result.userName,
      courseTitle: result.courseTitle,
      loginUrl: `${platformUrl}/login`,
      settingsUrl: `${platformUrl}/student/konto`,
      loginEmail: result.loginEmail,
      temporaryPassword: result.temporaryPassword,
      temporaryNickname: result.temporaryNickname,
      userCreated: result.userCreated,
    };

    const subject = getCourseEnrollmentConfirmationSubject(props);
    const element = React.createElement(CourseEnrollmentConfirmation, props);
    const html = await render(element);
    const text = await render(element, { plainText: true });

    await transporter.sendMail({
      from: mailOptions.from,
      to: result.toEmail,
      subject,
      text,
      html,
    });
  } catch (mailError) {
    // DB is already committed; email failures should not rollback.
    console.error("provisionPaidCheckout: email send failed", mailError);
  }

  return result;
}

