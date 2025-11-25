/**
 * Helper class cho việc parse và validate data
 */
export class ValidationHelper {
  /**
   * Parse sang boolean
   */
  static parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  }

  /**
   * Parse sang number (float)
   */
  static parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? null : num;
  }

  /**
   * Parse sang integer
   */
  static parseInt(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    return isNaN(num) ? null : num;
  }

  /**
   * Parse array từ JSON string
   */
  static parseArray(value: any): any[] | null {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}