import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

// ==========================================
// A. ENDPOINT UNTUK PUBLIK (Tanpa Login)
// ==========================================

// 1. Ambil Semua Video Terbaru
export const getPublicVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    });
    res.status(200).json({ success: true, data: videos });
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

    // Jika Editor, hanya tampilkan video yang dia masukkan. Admin tampil semua.
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
    const { title, youtubeUrl } = req.body;
    const userId = req.user?.id as string;

    if (!title || !youtubeUrl) {
      res.status(400).json({ success: false, message: "Judul dan URL YouTube wajib diisi." });
      return;
    }

    const newVideo = await prisma.video.create({
      data: {
        title,
        youtubeUrl,
        authorId: userId,
      },
    });

    res.status(201).json({ success: true, message: "Video kegiatan berhasil ditambahkan.", data: newVideo });
  } catch (error) {
    next(error);
  }
};

// 4. Hapus Video
export const deleteVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Cari video yang mau dihapus
    const video = await prisma.video.findUnique({ where: { id } });

    if (!video) {
      res.status(404).json({ success: false, message: "Video tidak ditemukan." });
      return;
    }

    // Otorisasi: Editor hanya boleh menghapus videonya sendiri
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
