import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    novelId: v.id("novels"),
    title: v.string(),
    chapterNumber: v.number(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chapters", {
      novelId: args.novelId,
      title: args.title,
      chapterNumber: args.chapterNumber,
      url: args.url,
      translateStatus: "not_requested",
    });
  },
});

export const getById = query({
  args: {
    id: v.id("chapters"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByChapterId = query({
  args: {
    chapterId: v.id("chapters"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chapterId);
  },
});

export const getByNovelIdAndChapterNumber = query({
  args: {
    novelId: v.optional(v.id("novels")),
    chapterNumber: v.number(),
  },
  handler: async (ctx, { chapterNumber, novelId }) => {
    if (novelId === undefined) {
      return null;
    }
    return await ctx.db
      .query("chapters")
      .withIndex("by_chapterNumber", (q) =>
        q.eq("novelId", novelId).eq("chapterNumber", chapterNumber),
      )
      .first();
  },
});

export const updateTranslatedUrl = mutation({
  args: {
    chapterId: v.id("chapters"),
    translatedUrl: v.string(),
  },
  handler: async (ctx, { chapterId, translatedUrl }) => {
    await ctx.db.patch(chapterId, {
      translatedUrl,
    });
  },
});

export const updateTranslateStatus = mutation({
  args: {
    chapterId: v.id("chapters"),
    translateStatus: v.union(
      v.literal("not_requested"),
      v.literal("requested"),
      v.literal("requesting_ai"),
      v.literal("saving_r2"),
      v.literal("updating_convex"),
      v.literal("completed"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, { chapterId, translateStatus }) => {
    await ctx.db.patch(chapterId, {
      translateStatus,
    });
  },
});
