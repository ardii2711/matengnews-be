import { Request } from "express";

export function parsePagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function parseSort(req: Request) {
  const sort = (req.query.sort as string) || "latest";
  switch (sort) {
    case "popular":
      return { views: "desc" as const };
    case "oldest":
      return { createdAt: "asc" as const };
    case "latest":
    default:
      return { createdAt: "desc" as const };
  }
}
