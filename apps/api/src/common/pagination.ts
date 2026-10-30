export function pageWindow(page = 1, pageSize = 20): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
