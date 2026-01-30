'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { submitDaka, getGlobalStats } from './actions' 
import { Toaster, toast } from 'sonner' 

type State = 'DISCONNECTED' | 'CONNECTED' | 'RECORDED_TODAY' | 'LOADING'

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [state, setState] = useState<State>('DISCONNECTED')
  
  // 新增：全局计数 & 规则弹窗开关
  const [globalCount, setGlobalCount] = useState(0)
  const [showRules, setShowRules] = useState(false)

  // 获取最新数据
  const refreshStats = async () => {
    const { count } = await getGlobalStats()
    setGlobalCount(count || 0)
  }

  // 检查当前用户状态
  const checkUserStatus = async () => {
    if (!publicKey) return

    const wallet = publicKey.toBase58()
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const todayUTC = `${year}-${month}-${day}`

    const { data } = await supabase
      .from('daka_logs')
      .select('id')
      .eq('wallet', wallet)
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
      refreshStats() // 成功后刷新一下总数
    } else {
      if (result.msg === 'Already daka today') {
        setState('RECORDED_TODAY')
        toast('Already recorded today.')
      } else {
        setState('CONNECTED')
        toast.error(result.msg)
      }
    }
  }

  // 初始化
  useEffect(() => {
    refreshStats() // 进来先查总数
    const timer = setInterval(refreshStats, 30000) // 每30秒自动刷新一次数据
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (connected && publicKey) {
      checkUserStatus()
    } else {
      setState('DISCONNECTED')
    }
  }, [connected, publicKey])

  return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
      <Toaster theme="dark" position="bottom-center" />

      {/* 背景装饰 (极简风格) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-900 to-transparent opacity-30"></div>

      <h1 className="mb-12 text-2xl tracking-[0.2em] font-light text-white/90 font-mono">
        0 before the dot
      </h1>

      {/* 核心交互区 */}
      <div className="z-10 flex flex-col items-center gap-8">
        
        {state === 'DISCONNECTED' && (
          <WalletMultiButton className="!bg-white/5 !rounded-full !border !border-white/10 hover:!bg-white/10 transition-all !font-mono !text-sm" />
        )}

        {state === 'CONNECTED' && (
          <button
            onClick={handleDaka}
            className="group relative px-16 py-5 rounded-full bg-transparent border border-[#d2b48c] text-[#d2b48c] hover:bg-[#d2b48c] hover:text-black transition-all duration-500 shadow-[0_0_20px_rgba(210,180,140,0.1)] hover:shadow-[0_0_40px_rgba(210,180,140,0.5)]"
          >
            <span className="tracking-[0.15em] font-bold text-lg">DAKA</span>
          </button>
        )}

        {state === 'LOADING' && (
           <div className="px-16 py-5 rounded-full border border-white/10 text-white/30 animate-pulse font-mono">
             VERIFYING...
           </div>
        )}

        {state === 'RECORDED_TODAY' && (
          <div className="flex flex-col items-center gap-2 animate-fade-in">
              <div className="px-16 py-5 rounded-full bg-white/5 text-white/40 border border-white/5 cursor-not-allowed tracking-widest">
                RECORDED
              </div>
          </div>
        )}

        {/* 真实数据展示 */}
        <div className="text-center space-y-2 mt-4">
            <div className="text-4xl font-mono font-thin text-white">{globalCount}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/30">
                Wallets Showed Up Today
            </div>
        </div>

      </div>

      {/* 底部 Rules 按钮 */}
      <div className="absolute bottom-8 flex gap-6 text-xs text-white/30 font-mono uppercase tracking-widest">
          <button onClick={() => setShowRules(true)} className="hover:text-white transition-colors border-b border-transparent hover:border-white/50 pb-1">
              Rules
          </button>
          <a href="https://twitter.com/dakkcoin" target="_blank" className="hover:text-white transition-colors border-b border-transparent hover:border-white/50 pb-1">
              Twitter
          </a>
      </div>

      {/* 简单的规则弹窗 */}
      {showRules && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowRules(false)}>
            <div className="bg-black border border-white/10 p-8 max-w-md w-full mx-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-mono mb-6 tracking-widest text-[#d2b48c]">PROTOCOL RULES</h3>
                <ul className="space-y-4 text-sm text-white/60 font-mono leading-relaxed">
                    <li className="flex gap-3">
                        <span className="text-white/20">01.</span>
                        <span>One daka per wallet, per UTC day.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-white/20">02.</span>
                        <span>No retries. Miss a day, miss it forever.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-white/20">03.</span>
                        <span>Anti-bot: Min 0.01 SOL required.</span>
                    </li>
                </ul>
                <button 
                    onClick={() => setShowRules(false)}
                    className="mt-8 w-full py-3 border border-white/10 hover:bg-white/5 text-white/40 text-xs tracking-widest uppercase transition-colors"
                >
                    I Understand
                </button>
            </div>
        </div>
      )}
    </main>
  )
}