import { PrismaClient } from "@prisma/client"; // Import dari folder hasil generate v7
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

// 1. Inisialisasi adapter PostgreSQL v7
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

// 2. Masukkan adapter tersebut ke dalam constructor PrismaClient
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
});

export default prisma;
