import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Editor hanya melihat statistik miliknya sendiri
    const postFilter = userRole === "EDITOR" ? { authorId: userId } : {};
    const videoFilter = userRole === "EDITOR" ? { authorId: userId } : {};

    const [totalPosts, publishedPosts, draftPosts, totalVideos] = await Promise.all([
      prisma.post.count({ where: postFilter }),
      prisma.post.count({ where: { ...postFilter, status: "PUBLISHED" } }),
      prisma.post.count({ where: { ...postFilter, status: "DRAFT" } }),
      prisma.video.count({ where: videoFilter }),
    ]);

    // Stats global — hanya Admin yang melihat data global
    const [totalCategories, totalUsers, totalViewsResult] =
      userRole === "ADMIN"
        ? await Promise.all([
            prisma.category.count(),
            prisma.user.count(),
            prisma.post.aggregate({ _sum: { views: true } }),
          ])
        : [
            await prisma.category.count(),
            0,
            await prisma.post.aggregate({
              _sum: { views: true },
              where: postFilter,
            }),
          ];

    res.status(200).json({
      success: true,
      data: {
        totalPosts,
        publishedPosts,
        draftPosts,
        totalVideos,
        totalCategories,
        totalUsers,
        totalViews: totalViewsResult._sum.views || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
