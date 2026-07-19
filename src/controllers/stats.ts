import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalPosts, publishedPosts, draftPosts, totalVideos, totalCategories, totalUsers] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.video.count(),
      prisma.category.count(),
      prisma.user.count(),
    ]);

    const totalViews = await prisma.post.aggregate({ _sum: { views: true } });

    res.status(200).json({
      success: true,
      data: {
        totalPosts,
        publishedPosts,
        draftPosts,
        totalVideos,
        totalCategories,
        totalUsers,
        totalViews: totalViews._sum.views || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
