'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type State = 'DISCONNECTED' | 'CONNECTED' | 'RECORDED_TODAY'

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [state, setState] = useState<State>('DISCONNECTED')
  const [count] = useState(2)

  // 今天的日期（YYYY-MM-DD）
  const today = new Date().toISOString().slice(0, 10)

  // 连接状态变化
  useEffect(() => {
    if (connected) setState('CONNECTED')
    else setState('DISCONNECTED')
  }, [connected])

  // 查询今天是否已打卡
  useEffect(() => {
    if (!publicKey) return

    const checkToday = async () => {
      const { data } = await supabase
        .from('daka_logs')
        .select('id')
        .eq('wallet', publicKey.toBase58())
        .eq('date', today)
        .single()

      if (data) {
        setState('RECORDED_TODAY')
      }
    }

    checkToday()
  }, [publicKey, today])

  // 点击打卡
  const handleDaka = async () => {
    if (!publicKey) return

    await supabase.from('daka_logs').insert({
      wallet: publicKey.toBase58(),
      date: today,
    })

    setState('RECORDED_TODAY')
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
            {publicKey?.toBase58().slice(0, 4)}...
            {publicKey?.toBase58().slice(-4)}
          </div>
        </>
      )}
    </main>
  )
}