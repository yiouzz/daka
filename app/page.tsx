'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { submitDaka, getGlobalStats } from './actions' 
import { Toaster, toast } from 'sonner' 

import '@solana/wallet-adapter-react-ui/styles.css'

type State = 'CHECKING' | 'DISCONNECTED' | 'CONNECTED' | 'RECORDED_TODAY' | 'LOADING'

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [state, setState] = useState<State>('CHECKING')
  const [globalCount, setGlobalCount] = useState(0)
  const [showRules, setShowRules] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // 1. 解决水合/闪烁问题
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 2. 获取数据
  const refreshStats = async () => {
    const { count } = await getGlobalStats()
    setGlobalCount(count || 0)
  }

  // 3. 检查状态
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

  // 4. 打卡动作
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

  // 定时刷新
  useEffect(() => {
    refreshStats()
    const timer = setInterval(refreshStats, 30000)
    return () => clearInterval(timer)
  }, [])

  // 钱包状态监听
  useEffect(() => {
    if (!isMounted) return
    
    if (connected && publicKey) {
      checkUserStatus()
    } else {
      const timer = setTimeout(() => {
        if (!connected) setState('DISCONNECTED')
      }, 50) 
      return () => clearTimeout(timer)
    }
  }, [connected, publicKey, isMounted])

  if (!isMounted) return <main className="h-screen bg-black" />

  return (
    <main 
      className="h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden selection:bg-[#834e00] selection:text-white"
      style={{ fontFamily: "'Andale Mono', monospace", color: '#d6cbc2' }}
    >
      <Toaster theme="dark" position="bottom-center" toastOptions={{ style: { background: '#222', color: '#d6cbc2', border: '1px solid #444' } }} />

      {/* 左上角 Logo */}
      <div className="absolute top-8 left-8 text-xs tracking-[0.2em] opacity-80">
        DAKK | 0 before the dot
      </div>

      {/* 主标题 */}
      <h1 className="mb-24 text-4xl sm:text-5xl tracking-[0.1em] text-[#d6cbc2]">
        0 before the dot
      </h1>

      {/* 核心交互区 */}
      <div className="z-10 flex flex-col items-center justify-center min-h-[140px]">
        
        {/* CHECKING: 占位 */}
        {state === 'CHECKING' && (
           <div className="opacity-0 h-[60px]">Loading...</div>
        )}

        {/* DISCONNECTED: Link Wallet */}
        {state === 'DISCONNECTED' && (
          <div className="flex flex-col items-center gap-4">
              <div className="custom-wallet-btn-wrapper transition-transform hover:scale-105 active:scale-95 duration-200">
                <WalletMultiButton style={{ 
                    backgroundColor: '#3c315b', 
                    border: '2px solid #ab9ff2',
                    borderRadius: '50px', // 圆角
                    height: '64px',
                    padding: '0 48px',
                    fontSize: '18px',
                    fontFamily: "'Andale Mono', monospace",
                    color: '#d6cbc2',
                    letterSpacing: '0.05em'
                }}>
                    Link Wallet
                </WalletMultiButton>
              </div>
              <span className="text-xs tracking-widest opacity-60">Solana only</span>
          </div>
        )}

        {/* CONNECTED: DAKA 按钮 */}
        {state === 'CONNECTED' && (
          <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleDaka}
                className="h-[64px] px-16 rounded-full text-xl tracking-[0.1em] transition-all duration-200 transform hover:scale-105 active:scale-95"
                style={{
                    backgroundColor: '#834e00',
                    border: '2px solid #f39800',
                    color: '#d6cbc2',
                    boxShadow: '0 0 30px rgba(131, 78, 0, 0.5)' // 发光 50%
                }}
              >
                DAKA
              </button>
              {/* 这里放计数器，或者放一个占位符保持高度一致 */}
              <div className="text-xs tracking-widest opacity-60">
                 {globalCount} / ∞
              </div>
          </div>
        )}

        {/* LOADING: 处理中 */}
        {state === 'LOADING' && (
           <div className="h-[64px] flex items-center px-16 text-[#d6cbc2] opacity-50 animate-pulse tracking-widest">
             ...
           </div>
        )}

        {/* RECORDED: 已完成 */}
        {state === 'RECORDED_TODAY' && (
          <div className="flex flex-col items-center gap-4">
              <button
                disabled
                className="h-[64px] px-16 rounded-full text-xl tracking-[0.1em] cursor-not-allowed"
                style={{
                    backgroundColor: '#262626', // 暗灰底
                    border: '2px solid #404040', // 灰边框
                    color: '#525252', // 暗灰字
                }}
              >
                Recorded
              </button>
              
              <div className="text-xs tracking-widest opacity-60">
                {globalCount} / ∞
              </div>
          </div>
        )}

      </div>

      {/* 底部信息: 钱包地址 (如果连接) */}
      {connected && publicKey && (
         <div className="mt-8 mb-4 flex items-center gap-3 text-sm tracking-widest opacity-80 font-mono">
             {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
             {/* 复制图标 (简单字符代替SVG以保持代码纯净) */}
             <button onClick={() => {navigator.clipboard.writeText(publicKey.toBase58()); toast.success('Copied')}} className="hover:text-white transition-colors">
                 ❐
             </button>
         </div>
      )}

      {/* 底部版权 */}
      <div className="absolute bottom-10 flex flex-col items-center gap-4">
          {/* Rules 按钮放在这里也可以，或者保持在原位，这里我按截图只放版权 */}
           <button 
            onClick={() => setShowRules(true)} 
            className="text-[10px] uppercase tracking-widest hover:text-white transition-colors opacity-50 mb-2"
          >
              [ Rules ]
          </button>

          <div className="text-[10px] tracking-widest opacity-40">
             © 2025 by Dakk. All rights reserved!
          </div>
      </div>

      {/* 规则弹窗 */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setShowRules(false)}>
            <div 
                className="bg-black p-10 max-w-sm w-full mx-6 shadow-2xl relative" 
                style={{ border: '1px solid #404040', color: '#d6cbc2' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-4 right-4 cursor-pointer opacity-50 hover:opacity-100" onClick={() => setShowRules(false)}>✕</div>
                <h3 className="text-sm mb-8 tracking-[0.2em] uppercase text-[#f39800]">Protocol Rules</h3>
                <ul className="space-y-6 text-xs leading-relaxed tracking-wider opacity-80">
                    <li className="flex gap-4">
                        <span className="text-[#f39800]">01.</span>
                        <span>One daka per wallet / UTC day.</span>
                    </li>
                    <li className="flex gap-4">
                        <span className="text-[#f39800]">02.</span>
                        <span>No retries. Miss a day, miss it forever.</span>
                    </li>
                    <li className="flex gap-4">
                        <span className="text-[#f39800]">03.</span>
                        <span>Min 0.01 SOL required to prevent spam.</span>
                    </li>
                </ul>
            </div>
        </div>
      )}
    </main>
  )
}