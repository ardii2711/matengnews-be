import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

// ==========================================
// A. ENDPOINT UNTUK PUBLIK (Tanpa Login)
// ==========================================

// 1. Ambil Semua Video Terbaru — dengan pagination
export const getPublicVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { author: { select: { name: true } } },
      }),
      prisma.video.count(),
    ]);

    res.status(200).json({
      success: true,
      data: videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// B. ENDPOINT UNTUK DASHBOARD (Butuh Login)
// ==========================================

// 2. Ambil Daftar Video untuk Dashboard
export const getDashboardVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const queryFilter = userRole === "EDITOR" ? { authorId: userId } : {};

    const videos = await prisma.video.findMany({
      where: queryFilter,
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    });

    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
};

// 3. Tambah Video Baru
export const createVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, youtubeUrl, description, thumbnailUrl } = req.body;
    const userId = req.user?.id as string;

    if (!title || !youtubeUrl) {
      res.status(400).json({ success: false, message: "Judul dan URL YouTube wajib diisi." });
      return;
    }

    const newVideo = await prisma.video.create({
      data: {
        title,
        youtubeUrl,
        description: description || null,
        thumbnailUrl: thumbnailUrl || null,
        authorId: userId,
      },
    });

    res.status(201).json({ success: true, message: "Video kegiatan berhasil ditambahkan.", data: newVideo });
  } catch (error) {
    next(error);
  }
};

// 4. Edit Video
export const updateVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, youtubeUrl, description, thumbnailUrl } = req.body;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const existingVideo = await prisma.video.findUnique({ where: { id } });

    if (!existingVideo) {
      res.status(404).json({ success: false, message: "Video tidak ditemukan." });
      return;
    }

    // Editor hanya boleh edit video miliknya sendiri
    if (userRole === "EDITOR" && existingVideo.authorId !== userId) {
      res.status(403).json({ success: false, message: "Akses ditolak. Anda hanya dapat mengedit video Anda sendiri." });
      return;
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        title: title || existingVideo.title,
        youtubeUrl: youtubeUrl || existingVideo.youtubeUrl,
        description: description !== undefined ? description : existingVideo.description,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existingVideo.thumbnailUrl,
      },
    });

    res.status(200).json({ success: true, message: "Video berhasil diperbarui.", data: updatedVideo });
  } catch (error) {
    next(error);
  }
};

// 5. Hapus Video
export const deleteVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const video = await prisma.video.findUnique({ where: { id } });

    if (!video) {
      res.status(404).json({ success: false, message: "Video tidak ditemukan." });
      return;
    }

    if (userRole === "EDITOR" && video.authorId !== userId) {
      res.status(403).json({ success: false, message: "Anda tidak memiliki hak untuk menghapus video ini." });
      return;
    }

    await prisma.video.delete({ where: { id } });

    res.status(200).json({ success: true, message: "Video berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};
