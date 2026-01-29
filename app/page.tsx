'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type State = 'DISCONNECTED' | 'CONNECTED' | 'RECORDED_TODAY'

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [state, setState] = useState<State>('DISCONNECTED')
  const [count, setCount] = useState<number>(0)

  const wallet = publicKey?.toBase58() || ''
  const today = new Date().toISOString().slice(0, 10)

  // ① 钱包连接 / 断开 → 状态切换 + 查询今日是否已打卡
  useEffect(() => {
    if (!connected || !wallet) {
      setState('DISCONNECTED')
      return
    }

    const checkToday = async () => {
      // 查询今天是否已打卡
      const { data } = await supabase
        .from('daka_logs')
        .select('id')
        .eq('wallet', wallet)
        .eq('daka_date', today)
        .maybeSingle()

      if (data) {
        setState('RECORDED_TODAY')
      } else {
        setState('CONNECTED')
      }

      // 同时查询累计打卡次数
      const { count } = await supabase
        .from('daka_logs')
        .select('*', { count: 'exact', head: true })
        .eq('wallet', wallet)

      setCount(count || 0)
    }

    checkToday()
  }, [connected, wallet, today])

  // ② 点击 DAKA → 写入 Supabase
  const handleDaka = async () => {
    if (!wallet) return

    const { error } = await supabase.from('daka_logs').insert({
      wallet,
      daka_date: today,
    })

    if (!error) {
      setState('RECORDED_TODAY')
      setCount((c) => c + 1)
    }
  }

  return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="mb-16 text-xl tracking-widest opacity-80">
        0 before the dot
      </h1>

      {state === 'DISCONNECTED' && (
        <WalletMultiButton className="!bg-purple-500 !rounded-full" />
      )}

      {state === 'CONNECTED' && (
        <button
          onClick={handleDaka}
          className="px-10 py-4 rounded-full bg-yellow-600 hover:shadow-lg transition"
        >
          DAKA
        </button>
      )}

      {state === 'RECORDED_TODAY' && (
        <button
          disabled
          className="px-10 py-4 rounded-full bg-gray-600 cursor-not-allowed"
        >
          Recorded
        </button>
      )}

      {connected && (
        <>
          <div className="mt-4 text-sm opacity-60">{count} / 10</div>
          <div className="mt-2 text-xs opacity-40">
            {wallet.slice(0, 4)}...{wallet.slice(-4)}
          </div>
        </>
      )}
    </main>
  )
}