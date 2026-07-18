import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../config/r2';
import path from 'path';
import crypto from 'crypto';

const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * Upload file dari memory buffer ke Cloudflare R2
 * @param file Objek file dari multer
 * @param folder Nama folder di dalam bucket (misal: 'thumbnails')
 * @returns String URL publik file yang sukses di-upload
 */
export const uploadToR2 = async (file: Express.Multer.File, folder: string = 'thumbnails'): Promise<string> => {
  // Generate nama file unik menggunakan random bytes agar tidak bentrok
  const fileExtension = path.extname(file.originalname);
  const randomName = crypto.randomBytes(16).toString('hex');
  const fileName = `${folder}/${randomName}${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  // Eksekusi upload ke Cloudflare R2
  await s3Client.send(command);

  // Kembalikan URL publik gambar (contoh: https://pub-xxx.r2.dev/thumbnails/randomname.jpg)
  return `${R2_PUBLIC_URL}/${fileName}`;
};

/**
 * Menghapus file di Cloudflare R2 berdasarkan URL publiknya
 * @param fileUrl URL lengkap berkas yang ingin dihapus
 */
export const deleteFromR2 = async (fileUrl: string): Promise<void> => {
  try {
    // Ambil path/Key file dari URL (menghilangkan base URL publik R2)
    const fileKey = fileUrl.replace(`${R2_PUBLIC_URL}/`, '');

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);
  } catch (error) {
    // Kita gunakan console.error agar server tidak crash jika gagal hapus (misal file sudah tidak ada)
    console.error('[Storage Error]: Gagal menghapus file dari R2:', error);
  }
};