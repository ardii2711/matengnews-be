import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

// 1. Ambil semua kategori (Akses: Publik)
export const getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { posts: true } },
      },
    });

    const data = categories.map(({ _count, ...cat }) => ({
      ...cat,
      postCount: _count.posts,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// 2. Buat Kategori Baru (Akses: Khusus Admin)
export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, description, imageUrl } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: "Nama kategori wajib diisi." });
      return;
    }

    const normalizedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Cek keunikan slug
    const existingCategory = await prisma.category.findUnique({ where: { slug: normalizedSlug } });
    if (existingCategory) {
      res.status(400).json({ success: false, message: "Slug kategori sudah digunakan, silakan buat slug lain." });
      return;
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        slug: normalizedSlug,
        description: description || null,
        imageUrl: imageUrl || null,
      },
    });

    res.status(201).json({ success: true, message: "Kategori baru berhasil ditambahkan.", data: newCategory });
  } catch (error) {
    next(error);
  }
};

// 3. Update Kategori (Akses: Khusus Admin)
export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, slug, description, imageUrl } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      res.status(404).json({ success: false, message: "Kategori tidak ditemukan." });
      return;
    }

    const normalizedSlug = slug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : category.slug);

    if (normalizedSlug !== category.slug) {
      const existingSlug = await prisma.category.findUnique({ where: { slug: normalizedSlug } });
      if (existingSlug) {
        res.status(400).json({ success: false, message: "Slug kategori sudah digunakan, silakan buat slug lain." });
        return;
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name || category.name,
        slug: normalizedSlug,
        description: description !== undefined ? (description || null) : category.description,
        imageUrl: imageUrl !== undefined ? (imageUrl || null) : category.imageUrl,
      },
    });

    res.status(200).json({ success: true, message: "Kategori berhasil diperbarui.", data: updatedCategory });
  } catch (error) {
    next(error);
  }
};

// 4. Hapus Kategori (Akses: Khusus Admin)
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
