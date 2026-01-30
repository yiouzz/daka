'use server'

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'

// 辅助函数：获取今日 UTC 日期字符串
function getTodayUTC() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取今日打卡总数
 */
export async function getGlobalStats() {
  try {
    const todayUTC = getTodayUTC()
    
    // count: 'exact' 会返回精确数量，head: true 表示不下载具体数据只数数（省流量）
    const { count, error } = await supabase
      .from('daka_logs')
      .select('*', { count: 'exact', head: true })
      .eq('daka_date', todayUTC)

    if (error) throw error
    
    return { success: true, count: count || 0 }
  } catch (err) {
    console.error('Stats Error:', err)
    return { success: false, count: 0 }
  }
}

/**
 * 提交打卡
 */
export async function submitDaka(walletAddress: string) {
  try {
    // 1. 验证地址
    let pubKey: PublicKey
    try {
      pubKey = new PublicKey(walletAddress)
    } catch (e) {
      return { success: false, msg: 'Invalid wallet address' }
    }

    // 2. 验证余额
    const connection = new Connection(SOLANA_RPC)
    const balance = await connection.getBalance(pubKey)
    
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      return { success: false, msg: 'SOL balance too low (< 0.01)' }
    }

    // 3. 写入数据库
    const todayUTC = getTodayUTC()
    const { error } = await supabase
      .from('daka_logs')
      .insert({
        wallet: walletAddress,
        daka_date: todayUTC
      })

    if (error) {
      if (error.code === '23505') {
        return { success: false, msg: 'Already daka today' }
      }
      return { success: false, msg: 'System busy, try again' }
    }

    return { success: true, msg: 'Recorded' }

  } catch (err) {
    console.error('Daka Action Error:', err)
    return { success: false, msg: 'Internal Error' }
  }
}