export interface AuditLogEntry {
  id: number;
  userId: number | null; // Thêm userId vào giao diện
  action: string;
  resource?: string | null;
  resourceId?: number | null;
  method?: string | null;
  route?: string | null;
  payload?: Record<string, any> | null;
  createdAt: string;
}

export function formatAuditLogs(logs: AuditLogEntry[]) {
  return logs.map(log => {
    // ✅ Parse action để dễ đọc hơn
    const actionParts = log.action.split('_');
    const method = actionParts[0];
    const route = actionParts.slice(1).join('_');
    
    const what = log.resource
      ? `${method} ${log.resource}${log.resourceId ? ` #${log.resourceId}` : ''}`
      : `${method} ${route}`;
    
    // ✅ Format thời gian đẹp hơn
    const when = new Date(log.createdAt).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    // ✅ Format payload đẹp hơn
    let details = '';
    if (log.payload && Object.keys(log.payload).length > 0) {
      const payloadStr = JSON.stringify(log.payload, null, 2);
      details = `\n  📦 Dữ liệu: ${payloadStr}`;
    }

    // ✅ Hiển thị userId
    const who = `ID người dùng: ${log.userId}`; // Thêm ID người dùng vào thông báo

    return `[${when}] 👤 ${who} ➜ ${what}${details}`;
  });
}
