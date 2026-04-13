import { describe, expect, it } from "vitest";
import { findNextLessonId, getOrderedCourseLessons } from "./course-navigation";

describe("course navigation helpers", () => {
  it("returns lessons sorted by module and lesson order", () => {
    const ordered = getOrderedCourseLessons([
      { id: "m2", order: 2, lessons: [{ id: "l3", order: 1 }] },
      {
        id: "m1",
        order: 1,
        lessons: [
          { id: "l2", order: 2 },
          { id: "l1", order: 1 },
        ],
      },
    ]);

    expect(ordered.map((lesson) => lesson.id)).toEqual(["l1", "l2", "l3"]);
  });

  it("returns null when current lesson is the last one", () => {
    const ordered = [{ id: "l1" }, { id: "l2" }];
    expect(findNextLessonId(ordered, "l2")).toBeNull();
  });
});
