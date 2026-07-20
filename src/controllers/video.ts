import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { parsePagination } from "../utils/pagination";

// ==========================================
// A. ENDPOINT UNTUK PUBLIK (Tanpa Login)
// ==========================================

// 1. Ambil Semua Video — hanya yang PUBLISHED
export const getPublicVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);

    const where = { status: "PUBLISHED" as const };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { author: { select: { name: true } } },
      }),
      prisma.video.count({ where }),
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

// 2. Ambil Daftar Video untuk Dashboard (dengan search & pagination)
export const getDashboardVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const search = (req.query.search as string) || "";
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const queryFilter: any = userRole === "EDITOR" ? { authorId: userId } : {};
    if (search) {
      queryFilter.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: queryFilter,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { author: { select: { name: true } } },
      }),
      prisma.video.count({ where: queryFilter }),
    ]);

    res.status(200).json({
      success: true,
      data: videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Tambah Video Baru
export const createVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, youtubeUrl, description, thumbnailUrl, status } = req.body;
    const userId = req.user?.id as string;
    const userRole = req.user?.role;

    if (!title || !youtubeUrl) {
      res.status(400).json({ success: false, message: "Judul dan URL YouTube wajib diisi." });
      return;
    }

    // Editor hanya bisa Draft
    const videoStatus = userRole === "ADMIN" ? (status || "DRAFT") : "DRAFT";
    const publishedAt = videoStatus === "PUBLISHED" ? new Date() : null;

    const newVideo = await prisma.video.create({
      data: {
        title,
        youtubeUrl,
        description: description || null,
        thumbnailUrl: thumbnailUrl || null,
        status: videoStatus,
        publishedAt,
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
    const { title, youtubeUrl, description, thumbnailUrl, status } = req.body;
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

    // Editor tidak boleh edit video yang sudah dipublish
    if (userRole === "EDITOR" && existingVideo.status === "PUBLISHED") {
      res.status(403).json({ success: false, message: "Akses ditolak. Video yang sudah dipublikasikan tidak dapat diedit." });
      return;
    }

    const updateData: Record<string, any> = {
      title: title || existingVideo.title,
      youtubeUrl: youtubeUrl || existingVideo.youtubeUrl,
      description: description !== undefined ? description : existingVideo.description,
      thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existingVideo.thumbnailUrl,
    };

    // Hanya Admin yang bisa ubah status
    if (userRole === "ADMIN" && status) {
      updateData.status = status;
      if (status === "PUBLISHED" && !existingVideo.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ success: true, message: "Video berhasil diperbarui.", data: updatedVideo });
  } catch (error) {
    next(error);
  }
};

// 5. Ubah Status Video (Khusus Admin)
export const changeVideoStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (status !== "PUBLISHED" && status !== "DRAFT") {
      res.status(400).json({ success: false, message: "Status tidak valid." });
      return;
    }

    const updateData: any = { status };

    if (status === "PUBLISHED") {
      const video = await prisma.video.findUnique({ where: { id }, select: { publishedAt: true } });
      if (video && !video.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ success: true, message: `Status video berhasil diubah menjadi ${status}.`, data: updatedVideo });
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

    // Editor tidak boleh hapus video yang sudah dipublish
    if (userRole === "EDITOR" && video.status === "PUBLISHED") {
      res.status(403).json({ success: false, message: "Akses ditolak. Video yang sudah dipublikasikan tidak dapat dihapus." });
      return;
    }

    await prisma.video.delete({ where: { id } });

    res.status(200).json({ success: true, message: "Video berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};
