/**
 * Tổng hợp tất cả câu lô tô dùng trong app.
 *
 * Ưu tiên:
 * 1. overridePhrases  – các câu bạn custom riêng (ưu tiên cao nhất)
 * 2. lyCayBong1Den20  – Lý Cây Bông 1–20
 * 3. cauLoto1Den90    – câu ngắn mặc định 1–90
 */
import { cauLoto1Den90 } from './cauLoto'
import { lyCayBong1Den20 } from './lyCayBong'
import { overridePhrases } from './overridePhrases'

// Gộp 3 nguồn lại, câu ngắn sẽ tự bị ghi đè bởi câu dài/override
export const lotoPhrases = {
  ...cauLoto1Den90,
  ...lyCayBong1Den20,
  ...overridePhrases,
}

