import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("novels").collect();
  },
});

export const getById = query({
  args: { id: v.id("novels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getStats = query({
  handler: async (ctx) => {
    const novels = await ctx.db.query("novels").collect();
    const chapters = await ctx.db.query("chapters").collect();

    return {
      novelCount: novels.length,
      chapterCount: chapters.length,
    };
  },
});

export const getUploads = query({
  args: { novelId: v.id("novels") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("uploads")
      .filter((q) => q.eq(q.field("novelId"), args.novelId))
      .collect();
  },
});

export const getChapters = query({
  args: { novelId: v.id("novels") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chapters")
      .withIndex("by_novel", (q) => q.eq("novelId", args.novelId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    originalTitle: v.optional(v.string()),
    coverPhoto: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if novel with same title already exists
    const existing = await ctx.db
      .query("novels")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .first();

    if (existing) {
      throw new Error("A novel with this title already exists");
    }

    const novelId = await ctx.db.insert("novels", args);
    return novelId;
  },
});

export const createUpload = mutation({
  args: {
    novelId: v.id("novels"),
    url: v.string(),
    isFull: v.boolean(),
    fromChapter: v.optional(v.number()),
    toChapter: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const uploadId = await ctx.db.insert("uploads", args);
    return uploadId;
  },
});
