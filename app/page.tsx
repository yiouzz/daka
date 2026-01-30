'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { submitDaka, getGlobalStats } from './actions' 
import { Toaster, toast } from 'sonner' 

// 引入一些必要的 CSS 样式覆盖（为了让钱包按钮变紫色）
import '@solana/wallet-adapter-react-ui/styles.css'

type State = 'CHECKING' | 'DISCONNECTED' | 'CONNECTED' | 'RECORDED_TODAY' | 'LOADING'

export default function Home() {
  const { publicKey, connected, wallet } = useWallet()
  const [state, setState] = useState<State>('CHECKING') // 初始状态改为 CHECKING
  const [globalCount, setGlobalCount] = useState(0)
  const [showRules, setShowRules] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // 1. 解决"闪烁"问题：确保组件加载完成后再渲染
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 获取全局计数
  const refreshStats = async () => {
    const { count } = await getGlobalStats()
    setGlobalCount(count || 0)
  }

  // 检查用户状态
  const checkUserStatus = async () => {
    if (!publicKey) {
      setState('DISCONNECTED')
      return
    }

    const walletAddress = publicKey.toBase58()
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const todayUTC = `${year}-${month}-${day}`

    const { data } = await supabase
      .from('daka_logs')
      .select('id')
      .eq('wallet', walletAddress)
      .eq('daka_date', todayUTC)
      .maybeSingle()

    if (data) setState('RECORDED_TODAY')
    else setState('CONNECTED')
  }

  const handleDaka = async () => {
    if (!publicKey) return
    setState('LOADING')

    const result = await submitDaka(publicKey.toBase58())

    if (result.success) {
      setState('RECORDED_TODAY')
      toast.success("0 before the dot.")
      refreshStats()
    } else {
      if (result.msg === 'Already daka today') {
        setState('RECORDED_TODAY')
      } else {
        setState('CONNECTED')
        toast.error(result.msg)
      }
    }
  }

  // 自动刷新数据
  useEffect(() => {
    refreshStats()
    const timer = setInterval(refreshStats, 30000)
    return () => clearInterval(timer)
  }, [])

  // 监听钱包状态变化
  useEffect(() => {
    if (!isMounted) return // 如果还没加载完，什么都不做
    
    if (connected && publicKey) {
      checkUserStatus()
    } else {
      // 这里加个小延迟，防止刷新时瞬间闪烁
      const timer = setTimeout(() => {
        if (!connected) setState('DISCONNECTED')
      }, 100) 
      return () => clearTimeout(timer)
    }
  }, [connected, publicKey, isMounted])

  // 防止水合不匹配，加载前只显示纯黑背景
  if (!isMounted) return <main className="h-screen bg-black" />

  return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white relative font-mono">
      <Toaster theme="dark" position="bottom-center" />

      {/* 标题 */}
      <h1 className="mb-24 text-2xl tracking-[0.15em] opacity-90 text-[#e0e0e0]">
        0 before the dot
      </h1>

      {/* 核心交互区域 */}
      <div className="z-10 flex flex-col items-center justify-center min-h-[100px]">
        
        {/* 状态：加载中 (不显示按钮，或者显示一个占位符，防止跳动) */}
        {state === 'CHECKING' && (
           <div className="opacity-0">Loading...</div>
        )}

        {/* 状态：未连接 (还原紫色按钮) */}
        {state === 'DISCONNECTED' && (
          <div className="custom-wallet-btn-wrapper">
             <WalletMultiButton style={{ 
                 backgroundColor: '#5b21b6', // 紫色
                 borderRadius: '9999px', 
                 height: '60px',
                 padding: '0 40px',
                 fontSize: '16px',
                 fontFamily: 'monospace'
             }}>
                Link Wallet
             </WalletMultiButton>
          </div>
        )}

        {/* 状态：已连接，可打卡 (还原橙色发光按钮) */}
        {state === 'CONNECTED' && (
          <button
            onClick={handleDaka}
            className="px-16 py-4 rounded-full bg-[#92400e] text-[#fcd34d] font-bold text-xl tracking-widest shadow-[0_0_30px_rgba(146,64,14,0.6)] hover:bg-[#b45309] hover:shadow-[0_0_50px_rgba(180,83,9,0.8)] transition-all duration-300 transform hover:scale-105"
          >
            DAKA
          </button>
        )}

        {/* 状态：处理中 */}
        {state === 'LOADING' && (
           <button disabled className="px-16 py-4 rounded-full bg-neutral-800 text-neutral-500 font-bold text-xl tracking-widest cursor-wait">
             ...
           </button>
        )}

        {/* 状态：已完成 (还原灰色按钮) */}
        {state === 'RECORDED_TODAY' && (
          <div className="flex flex-col items-center gap-4">
              <button
                disabled
                className="px-16 py-4 rounded-full bg-[#262626] text-[#525252] font-bold text-xl tracking-widest cursor-not-allowed border border-[#404040]"
              >
                Recorded
              </button>
              
              {/* 计数器放在这里，低调显示 */}
              <div className="text-[10px] text-neutral-600 tracking-[0.2em] mt-2">
                {globalCount} / ∞
              </div>
          </div>
        )}

      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-10 flex flex-col items-center gap-4">
          
          {/* 只有连接后才显示钱包地址 */}
          {connected && publicKey && (
            <div className="text-[10px] text-neutral-700 font-mono tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-900 animate-pulse"></span>
                 {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </div>
          )}

          {/* 规则入口 */}
          <button 
            onClick={() => setShowRules(true)} 
            className="text-[10px] text-neutral-800 hover:text-neutral-500 transition-colors uppercase tracking-widest"
          >
              Protocol Rules
          </button>
          
          <div className="text-[10px] text-neutral-900">
             © 2025 by Dakk. All rights reserved!
          </div>
      </div>

      {/* 规则弹窗 (保持纯黑风格) */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setShowRules(false)}>
            <div className="bg-black border border-neutral-800 p-8 max-w-sm w-full mx-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-mono mb-6 tracking-widest text-neutral-400 border-b border-neutral-900 pb-2">RULES</h3>
                <ul className="space-y-4 text-xs text-neutral-500 font-mono leading-relaxed">
                    <li className="flex gap-3">
                        <span className="text-neutral-700">01</span>
                        <span>One daka per wallet / UTC day.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-neutral-700">02</span>
                        <span>No retries. Miss it, miss it.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-neutral-700">03</span>
                        <span>Min 0.01 SOL to prevent spam.</span>
                    </li>
                </ul>
                <button 
                    onClick={() => setShowRules(false)}
                    className="mt-8 w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-500 text-[10px] tracking-widest uppercase transition-colors rounded"
                >
                    Close
                </button>
            </div>
        </div>
      )}
    </main>
  )
}