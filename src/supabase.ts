import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// 환경 변수 확인 (보안 상 SERVICE_ROLE_KEY는 출력하지 않음)
console.log("🔹 Supabase URL:", process.env.SUPABASE_URL);
console.log("🔹 Supabase Service Role Key:", process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ Missing Supabase environment variables. Check your .env file.");
}

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default supabase;
