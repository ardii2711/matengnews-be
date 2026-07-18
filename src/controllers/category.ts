import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

// 1. Ambil semua kategori (Akses: Publik)
export const getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// 2. Buat Kategori Baru (Akses: Khusus Admin)
export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      res.status(400).json({ success: false, message: "Nama dan Slug kategori wajib diisi." });
      return;
    }

    // Cek kelangkaan slug
    const existingCategory = await prisma.category.findUnique({ where: { slug } });
    if (existingCategory) {
      res.status(400).json({ success: false, message: "Slug kategori sudah digunakan, silakan buat slug lain." });
      return;
    }

    const newCategory = await prisma.category.create({
      data: { name, slug: slug.toLowerCase().replace(/ /g, "-") },
    });

    res.status(201).json({ success: true, message: "Kategori baru berhasil ditambahkan.", data: newCategory });
  } catch (error) {
    next(error);
  }
};

// 3. Hapus Kategori (Akses: Khusus Admin)
export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Penegasan tipe (Type Casting) agar TS yakin ini pasti string tunggal
    const id = req.params.id as string;

    // 1. Periksa apakah kategori tersebut ada di database
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      res.status(404).json({ success: false, message: "Kategori tidak ditemukan." });
      return;
    }

    // 2. Hitung jumlah berita yang menggunakan kategori ini
    // Cara ini jauh lebih aman untuk TypeScript dan lebih ringan untuk database
    const postsCount = await prisma.post.count({
      where: { categoryId: id },
    });

    // 3. Aturan Restrict: Kategori tidak boleh dihapus jika masih ada beritanya
    if (postsCount > 0) {
      res.status(400).json({
        success: false,
        message: `Kategori gagal dihapus. Terdapat ${postsCount} berita yang masih menggunakan kategori ini. Pindahkan atau hapus berita tersebut terlebih dahulu.`,
      });
      return;
    }

    // 4. Eksekusi penghapusan jika aman
    await prisma.category.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Kategori sukses dihapus." });
  } catch (error) {
    next(error);
  }
};
