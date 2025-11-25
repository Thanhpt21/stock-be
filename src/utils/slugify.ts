export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')                    // Tách các ký tự có dấu
    .replace(/[\u0300-\u036f]/g, '')    // Xóa dấu
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')                // Thay khoảng trắng bằng -
    .replace(/[^\w\-]+/g, '')            // Xóa ký tự không hợp lệ
    .replace(/\-\-+/g, '-');             // Xóa các dấu -- liên tiếp
}
