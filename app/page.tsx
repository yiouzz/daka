'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { submitDaka } from './actions' 
import { Toaster, toast } from 'sonner' 

// 定义几种简单的状态
type State = 'DISCONNECTED' | 'CONNECTED' | 'RECORDED_TODAY' | 'LOADING'

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [state, setState] = useState<State>('DISCONNECTED')

  // 检查状态（只负责看，不负责改）
  const checkStatus = async () => {
    if (!publicKey) return

    const wallet = publicKey.toBase58()
    
    // 算出 UTC 时间字符串
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const todayUTC = `${year}-${month}-${day}`

    // 问问数据库：这个钱包今天有记录吗？
    const { data } = await supabase
      .from('daka_logs')
      .select('id')
      .eq('wallet', wallet)
      .eq('daka_date', todayUTC)
      .maybeSingle()

    if (data) {
      setState('RECORDED_TODAY')
    } else {
      setState('CONNECTED')
    }
  }

  // 点击 DAKA 按钮触发
  const handleDaka = async () => {
    if (!publicKey) return
    
    // 1. 界面变更为加载中
    setState('LOADING')

    // 2. 呼叫后端裁判 (调用 actions.ts)
    const result = await submitDaka(publicKey.toBase58())

    // 3. 根据裁判结果更新界面
    if (result.success) {
      setState('RECORDED_TODAY')
      toast.success("0 before the dot.") // 成功弹窗
    } else {
      if (result.msg === 'Already daka today') {
        setState('RECORDED_TODAY')
        toast('Already recorded today.')
      } else {
        // 其他错误（比如没钱，或者系统错误）
        setState('CONNECTED')
        toast.error(result.msg)
      }
    }
  }

  // 当钱包连接状态改变时，自动检查
  useEffect(() => {
    if (connected && publicKey) {
      checkStatus()
    } else {
      setState('DISCONNECTED')
    }
  }, [connected, publicKey])

  return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white relative">
      {/* 弹窗组件放在这里 */}
      <Toaster theme="dark" position="bottom-center" />

      <h1 className="mb-16 text-xl tracking-widest opacity-80 font-mono">
        0 before the dot
      </h1>

      {/* 状态 1: 未连接 */}
      {state === 'DISCONNECTED' && (
        <WalletMultiButton className="!bg-purple-900/50 !rounded-full !border !border-purple-500/30 hover:!bg-purple-800 transition-all" />
      )}

      {/* 状态 2: 已连接，可打卡 */}
      {state === 'CONNECTED' && (
        <button
          onClick={handleDaka}
          className="group relative px-12 py-4 rounded-full bg-transparent border border-[#d2b48c] text-[#d2b48c] hover:bg-[#d2b48c] hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(210,180,140,0.3)] hover:shadow-[0_0_25px_rgba(210,180,140,0.6)]"
        >
          <span className="tracking-widest font-bold">DAKA</span>
        </button>
      )}

      {/* 状态 3: 处理中 */}
      {state === 'LOADING' && (
         <button disabled className="px-12 py-4 rounded-full bg-gray-800 text-gray-400 border border-gray-700 cursor-wait">
           Processing...
         </button>
      )}

      {/* 状态 4: 今日已完成 */}
      {state === 'RECORDED_TODAY' && (
        <div className="flex flex-col items-center gap-4">
            <button
            disabled
            className="px-12 py-4 rounded-full bg-gray-900 text-gray-500 border border-gray-800 cursor-not-allowed"
            >
            Recorded
            </button>
            <p className="text-xs text-gray-600 font-mono">See you tomorrow UTC 0</p>
        </div>
      )}

      {/* 底部钱包地址展示 */}
      {connected && publicKey && (
        <div className="absolute bottom-10 flex flex-col items-center gap-2">
          <div className="text-xs opacity-30 font-mono">
             {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
          </div>
        </div>
      )}
    </main>
  )
}