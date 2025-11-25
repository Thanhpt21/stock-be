export function convertVnpDate(vnpPayDate: string): Date {
  const year = +vnpPayDate.slice(0, 4);
  const month = +vnpPayDate.slice(4, 6) - 1;
  const day = +vnpPayDate.slice(6, 8);
  const hour = +vnpPayDate.slice(8, 10);
  const minute = +vnpPayDate.slice(10, 12);
  const second = +vnpPayDate.slice(12, 14);

  return new Date(year, month, day, hour, minute, second);
}
