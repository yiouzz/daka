'use server'

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'

function getTodayUTC() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取今日数据 + 目标设定
 */
export async function getGlobalStats() {
  try {
    const todayUTC = getTodayUTC()
    
    // 1. 获取今日打卡数
    const { count, error } = await supabase
      .from('daka_logs')
      .select('*', { count: 'exact', head: true })
      .eq('daka_date', todayUTC)

    if (error) throw error

    // 2. 获取数据库里设定的“目标数”
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'target_count')
      .single()

    const target = settings?.value || '10'
    
    return { success: true, count: count || 0, target }
  } catch (err) {
    console.error('Stats Error:', err)
    return { success: false, count: 0, target: '10' }
  }
}

/**
 * 提交打卡
 */
export async function submitDaka(walletAddress: string) {
  try {
    let pubKey: PublicKey
    try {
      pubKey = new PublicKey(walletAddress)
    } catch (e) {
      return { success: false, msg: 'Invalid wallet address' }
    }

    const connection = new Connection(SOLANA_RPC)
    
    // 【修复点】：并行查询余额和交易历史
    // getSignaturesForAddress: 查询该地址的历史交易签名，limit: 1 表示只要查到1条就算有历史
    const [balance, signatures] = await Promise.all([
      connection.getBalance(pubKey),
      connection.getSignaturesForAddress(pubKey, { limit: 1 })
    ])
    
    // 【规则 3.1】余额检查
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      return { success: false, msg: 'SOL balance too low (< 0.01)' }
    }

    // 【规则 3.2】活跃度检查 (修复版)
    // 如果签名数组长度为 0，说明没有任何交易历史
    if (signatures.length === 0) {
      return { success: false, msg: 'Wallet no history detected' }
    }

    // 【规则 1 & 2】唯一性检查
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
      console.error('Supabase error:', error)
      return { success: false, msg: 'System busy, try again' }
    }

    return { success: true, msg: 'Recorded' }

  } catch (err) {
    console.error('Daka Action Error:', err)
    return { success: false, msg: 'Internal Error' }
  }
}