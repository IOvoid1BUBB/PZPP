import { describe, expect, it } from "vitest";
import { calculateCourseProgress } from "./course-progress";

describe("calculateCourseProgress", () => {
  it("returns rounded percentage for valid values", () => {
    expect(calculateCourseProgress(3, 8)).toBe(38);
  });

  it("returns 0 for course without lessons", () => {
    expect(calculateCourseProgress(0, 0)).toBe(0);
  });

  it("clamps completed lessons to total lessons", () => {
    expect(calculateCourseProgress(15, 10)).toBe(100);
  });
});
