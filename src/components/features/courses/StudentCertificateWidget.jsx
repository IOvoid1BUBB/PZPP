"use client";

import { useEffect, useState } from "react";
import { getStudentCertificateProgress } from "@/app/actions/courseActions";
import StudentCertificateCard from "@/components/student/StudentCertificateWidget";

export default function StudentCertificateWidget({ courseId }) {
  const [state, setState] = useState({
    isLoading: true,
    shouldRender: false,
    progress: 0,
    certificate: null,
    courseTitle: "",
    studentName: "",
  });

  useEffect(() => {
    let isActive = true;

    const fetchProgress = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));
      const result = await getStudentCertificateProgress(courseId ?? null);
      if (!isActive) return;

      if (!result?.success || !result?.shouldRender) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          shouldRender: false,
        }));
        return;
      }

      setState({
        isLoading: false,
        shouldRender: true,
        progress: result.progress ?? 0,
        certificate: result.certificate ?? null,
        courseTitle: result.courseTitle ?? "",
        studentName: result.studentName ?? "",
      });
    };

    fetchProgress();

    return () => {
      isActive = false;
    };
  }, [courseId]);

  if (state.isLoading || !state.shouldRender) return null;

  return <StudentCertificateCard data={state} />;
}
