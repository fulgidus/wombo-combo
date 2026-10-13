import { describe, test, expect } from "bun:test";
import { FeedbackStore } from "./feedback-store";

describe("FeedbackStore", () => {
  test("take returns the feedback once, then clears it", () => {
    const store = new FeedbackStore();
    store.set("t1", "fix it");
    expect(store.take("t1")).toBe("fix it");
    expect(store.take("t1")).toBeUndefined();
    expect(store.has("t1")).toBe(false);
  });

  test("get does not consume; delete removes", () => {
    const store = new FeedbackStore();
    store.set("t1", "a");
    expect(store.get("t1")).toBe("a");
    expect(store.has("t1")).toBe(true);
    expect(store.delete("t1")).toBe(true);
    expect(store.get("t1")).toBeUndefined();
  });

  test("entries are per task", () => {
    const store = new FeedbackStore();
    store.set("a", "1");
    store.set("b", "2");
    expect(store.take("a")).toBe("1");
    expect(store.get("b")).toBe("2");
  });
});
