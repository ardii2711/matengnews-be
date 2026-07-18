import prisma from "../config/db";
import { hashPassword } from "./auth";

async function main() {
  console.log("Memulai proses seeding...");

  const hashedPassword = await hashPassword("rahasia123"); // Password untuk login

  // upsert: Jika email sudah ada, biarkan. Jika belum, buat baru.
  const admin = await prisma.user.upsert({
    where: { email: "admin@matengnews.id" },
    update: {},
    create: {
      email: "admin@matengnews.id",
      name: "Super Admin Mateng",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Akun Admin berhasil dibuat!");
  console.log(`Email: ${admin.email}`);
  console.log("Password: rahasia123");
}

main()
  .catch((e) => {
    console.error("❌ Gagal seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
