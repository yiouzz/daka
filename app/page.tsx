'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type State = 'DISCONNECTED' | 'CONNECTED' | 'RECORDED_TODAY'

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [state, setState] = useState<State>('DISCONNECTED')
  const [count] = useState(2) // 先占位，后面再算真实次数

  /**
   * 检查「今天 UTC 是否已打卡」
   */
  const checkToday = async () => {
    if (!publicKey) return

    const wallet = publicKey.toBase58()

    // 今天 UTC 00:00
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)

    // 明天 UTC 00:00
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)

    const { data, error } = await supabase
      .from('daka_logs')
      .select('id')
      .eq('wallet', wallet)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .limit(1)

    if (error) {
      console.error('checkToday error:', error)
      setState('CONNECTED')
      return
    }

    if (data && data.length > 0) {
      setState('RECORDED_TODAY')
    } else {
      setState('CONNECTED')
    }
  }

  /**
   * 点击 DAKA
   */
  const handleDaka = async () => {
    if (!publicKey) return

    const wallet = publicKey.toBase58()

    // 再查一次，防止重复
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)

    const { data } = await supabase
      .from('daka_logs')
      .select('id')
      .eq('wallet', wallet)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .limit(1)

    if (data && data.length > 0) {
      setState('RECORDED_TODAY')
      return
    }

    const { error } = await supabase.from('daka_logs').insert({
      wallet,
    })

    if (error) {
      console.error('insert error:', error)
      return
    }

    setState('RECORDED_TODAY')
  }

  /**
   * 钱包状态变化时
   */
  useEffect(() => {
    if (connected) {
      checkToday()
    } else {
      setState('DISCONNECTED')
    }
  }, [connected])

  return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="mb-16 text-xl tracking-widest opacity-80">
        0 before the dot
      </h1>

      {/* 未连接钱包 */}
      {state === 'DISCONNECTED' && (
        <WalletMultiButton className="!bg-purple-500 !rounded-full" />
      )}

      {/* 可打卡 */}
      {state === 'CONNECTED' && (
        <button
          onClick={handleDaka}
          className="px-10 py-4 rounded-full bg-yellow-600 hover:shadow-lg transition"
        >
          DAKA
        </button>
      )}

      {/* 已打卡 */}
      {state === 'RECORDED_TODAY' && (
        <button
          disabled
          className="px-10 py-4 rounded-full bg-gray-600 cursor-not-allowed"
        >
          Recorded
        </button>
      )}

      {/* 钱包信息 */}
      {connected && publicKey && (
        <>
          <div className="mt-4 text-sm opacity-60">{count} / 10</div>
          <div className="mt-2 text-xs opacity-40">
            {publicKey.toBase58().slice(0, 4)}...
            {publicKey.toBase58().slice(-4)}
          </div>
        </>
      )}
    </main>
  )
}