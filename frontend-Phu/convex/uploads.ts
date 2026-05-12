import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("novels").collect();
  },
});

export const getByNovelId = query({
  args: {
    novelId: v.id("novels"),
  },
  handler: async (ctx, { novelId }) => {
    return await ctx.db
      .query("uploads")
      .withIndex("byNovelId", (q) => q.eq("novelId", novelId))
      .collect();
  },
});
