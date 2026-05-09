import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  novels: defineTable({
    title: v.string(),
    originalTitle: v.optional(v.string()),
    coverPhoto: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
  }).index("by_title", ["title"]),
  uploads: defineTable({
    novelId: v.id("novels"),
    url: v.string(),
    isFull: v.boolean(),
    fromChapter: v.optional(v.number()),
    toChapter: v.optional(v.number()),
  }),
  chapters: defineTable({
    novelId: v.id("novels"),
    url: v.optional(v.string()),
  }).index("by_novel", ["novelId"]),
});
