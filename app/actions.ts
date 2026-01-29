'use server'

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createClient } from '@supabase/supabase-js'

// 初始化 Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Solana 主网节点
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'

export async function submitDaka(walletAddress: string) {
  try {
    // 1. 验证地址格式是否正确
    let pubKey: PublicKey
    try {
      pubKey = new PublicKey(walletAddress)
    } catch (e) {
      return { success: false, msg: 'Invalid wallet address' }
    }

    // 2. 验证 SOL 余额 (必须 >= 0.01 SOL)
    const connection = new Connection(SOLANA_RPC)
    const balance = await connection.getBalance(pubKey)
    
    // 如果余额不足，直接拒绝
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      return { success: false, msg: 'SOL balance too low (< 0.01)' }
    }

    // 3. 获取当前的 UTC 日期
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const todayUTC = `${year}-${month}-${day}`

    // 4. 尝试写入数据库
    const { error } = await supabase
      .from('daka_logs')
      .insert({
        wallet: walletAddress,
        daka_date: todayUTC
      })

    // 5. 错误处理
    if (error) {
      // 错误代码 23505 代表违反唯一约束 (今天已经打过卡了)
      if (error.code === '23505') {
        return { success: false, msg: 'Already daka today' }
      }
      console.error('Supabase error:', error)
      return { success: false, msg: 'System busy, try again' }
    }

    return { success: true, msg: 'Recorded' }

  } catch (err) {
    console.error('Daka Action Error:', err)
    return { success: false, msg: 'Internal Error' }
  }
}