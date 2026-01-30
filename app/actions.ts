'use server'

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'

function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

export async function submitDaka(walletAddress: string) {
  try {
    const pubKey = new PublicKey(walletAddress)
    const connection = new Connection(SOLANA_RPC)
    const todayUTC = getTodayUTC()

    // 1. 获取配置
    const { data: settingsData } = await supabase.from('app_settings').select('key, value');
    
    const config = {
        min_age: 30,
        min_sol: 0.01,
        min_tx: 2,
        is_testing: false
    };

    settingsData?.forEach(item => {
        if (item.key === 'min_wallet_age_days') config.min_age = parseInt(item.value);
        if (item.key === 'min_sol_balance') config.min_sol = parseFloat(item.value);
        if (item.key === 'min_tx_count') config.min_tx = parseInt(item.value);
        if (item.key === 'is_testing_mode') config.is_testing = (item.value === 'true');
    });

    // 2. 如果不是测试模式，才执行安全检查
    if (!config.is_testing) {
        const [balance, signatures] = await Promise.all([
          connection.getBalance(pubKey),
          connection.getSignaturesForAddress(pubKey, { limit: 100 }) 
        ]);

        if (balance < config.min_sol * LAMPORTS_PER_SOL) {
          return { success: false, msg: `SOL balance < ${config.min_sol}` };
        }

        if (signatures.length < config.min_tx) {
          return { success: false, msg: 'Wallet not active enough' };
        }

        const oldestSig = signatures[signatures.length - 1];
        if (oldestSig && oldestSig.blockTime) {
            const oldestDate = oldestSig.blockTime * 1000;
            const deadline = Date.now() - (config.min_age * 24 * 60 * 60 * 1000);
            if (oldestDate > deadline) {
                return { success: false, msg: `Wallet must be > ${config.min_age} days old` };
            }
        }
    }

    // 3. 写入记录
    const { error: insertError } = await supabase
      .from('daka_logs')
      .insert({ wallet: walletAddress, daka_date: todayUTC });

    if (insertError) {
      // 如果是测试模式，即便数据库报错（因为唯一约束），我们也返回成功，让前端能继续点
      if (config.is_testing) return { success: true, msg: 'Test Mode: Entry ignored but allowed' };
      
      if (insertError.code === '23505') return { success: false, msg: 'Already daka today' };
      return { success: false, msg: 'Database Error' };
    }

    await updateSignStats(walletAddress, todayUTC);
    return { success: true, msg: 'Recorded' };

  } catch (err) {
    return { success: false, msg: 'Internal Error' };
  }
}

async function updateSignStats(wallet: string, today: string) {
    try {
        const { data } = await supabase.from('user_stats').select('*').eq('wallet', wallet).single();
        if (!data) {
            await supabase.from('user_stats').insert({ wallet, last_daka_date: today, consecutive_days: 1, total_daka_count: 1 });
        } else {
            const yesterday = new Date();
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            let newConsecutive = 1;
            if (data.last_daka_date === yesterdayStr) newConsecutive = data.consecutive_days + 1;
            else if (data.last_daka_date === today) newConsecutive = data.consecutive_days;

            await supabase.from('user_stats').update({
                last_daka_date: today,
                consecutive_days: newConsecutive,
                total_daka_count: data.total_daka_count + 1,
                is_qualified: newConsecutive >= 10 ? true : data.is_qualified
            }).eq('wallet', wallet);
        }
    } catch (e) {}
}

export async function getGlobalStats() {
    try {
        const { count } = await supabase.from('daka_logs').select('*', { count: 'exact', head: true }).eq('daka_date', getTodayUTC());
        const { data: settings } = await supabase.from('app_settings').select('key, value');
        const target = settings?.find(s => s.key === 'target_count')?.value || '10';
        const isTesting = settings?.find(s => s.key === 'is_testing_mode')?.value === 'true'; // 新增
        return { success: true, count: count || 0, target, isTesting };
    } catch (err) {
        return { success: false, count: 0, target: '10', isTesting: false };
    }
}