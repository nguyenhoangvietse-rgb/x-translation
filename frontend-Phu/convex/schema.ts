import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  novels: defineTable({
    title: v.string(),
    slug: v.string(),
    originalTitle: v.optional(v.string()),
    coverPhoto: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
  })
    .index("by_title", ["title"])
    .index("by_slug", ["slug"]),
  uploads: defineTable({
    novelId: v.id("novels"),
    url: v.string(),
    isFull: v.boolean(),
    fromChapter: v.optional(v.number()),
    toChapter: v.optional(v.number()),
  }).index("byNovelId", ["novelId"]),
  chapters: defineTable({
    novelId: v.id("novels"),
    title: v.optional(v.string()),
    chapterNumber: v.number(),
    url: v.optional(v.string()),
    translatedUrl: v.optional(v.string()),
    translateStatus: v.optional(
      v.union(
        v.literal("not_requested"),
        v.literal("requested"),
        v.literal("requesting_ai"),
        v.literal("saving_r2"),
        v.literal("updating_convex"),
        v.literal("completed"),
        v.literal("error"),
      ),
    ),
  })
    .index("by_novel", ["novelId"])
    .index("by_chapterNumber", ["novelId", "chapterNumber"]),
});
