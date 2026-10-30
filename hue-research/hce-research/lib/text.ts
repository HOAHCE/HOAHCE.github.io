/** Chuẩn hoá để tìm không phân biệt dấu/hoa thường (dùng được cả ở trình duyệt và máy chủ). */
export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
