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
  const [targetCount, setTargetCount] = useState('10') 
  const [isTestingMode, setIsTestingMode] = useState(false) // 新增测试状态
  const [showRules, setShowRules] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const refreshStats = async () => {
    const { count, target, isTesting } = await getGlobalStats()
    setGlobalCount(count || 0)
    if (target) setTargetCount(target)
    setIsTestingMode(!!isTesting)
  }

  const checkUserStatus = async () => {
    if (!publicKey) {
      setState('DISCONNECTED')
      return
    }

    // 如果是测试模式，直接允许打卡，不查数据库
    if (isTestingMode) {
      setState('CONNECTED')
      return
    }

    const walletAddress = publicKey.toBase58()
    const todayUTC = new Date().toISOString().split('T')[0]

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
      // 如果是测试模式，成功后依然保持 CONNECTED 状态，让你继续点
      if (isTestingMode) {
        setState('CONNECTED')
        toast.success("Test Mode: Recorded Success")
      } else {
        setState('RECORDED_TODAY')
        toast.success("0 before the dot.")
      }
      refreshStats()
    } else {
      setState('CONNECTED')
      toast.error(result.msg)
    }
  }

  useEffect(() => {
    refreshStats()
    const timer = setInterval(refreshStats, 30000)
    return () => clearInterval(timer)
  }, [])

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
  }, [connected, publicKey, isMounted, isTestingMode]) // 增加 isTestingMode 监听

  if (!isMounted) return <main className="h-[100dvh] bg-black" />

  return (
    <main 
      className="h-[100dvh] w-full bg-black flex flex-col items-center justify-between py-10 relative overflow-hidden selection:bg-[#834e00] selection:text-white touch-none"
      style={{ fontFamily: "'Andale Mono', monospace", color: '#d6cbc2' }}
    >
      <Toaster theme="dark" position="bottom-center" toastOptions={{ style: { background: '#222', color: '#d6cbc2', border: '1px solid #444' } }} />

      <div className="absolute top-6 left-6 md:top-8 md:left-8 text-[10px] md:text-xs tracking-[0.2em] opacity-80 z-20">
        DAKK | 0 before the dot {isTestingMode && <span className="text-red-500 ml-2">[TEST MODE]</span>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full transform scale-90 md:scale-100 transition-transform duration-300">
        <h1 className="mb-16 md:mb-24 text-2xl md:text-5xl tracking-[0.1em] text-[#d6cbc2] whitespace-nowrap">
          0 before the dot
        </h1>

        <div className="flex flex-col items-center justify-center min-h-[140px]">
          {state === 'CHECKING' && <div className="opacity-0 h-[60px]">Loading...</div>}

          {state === 'DISCONNECTED' && (
            <div className="flex flex-col items-center gap-4">
                <div className="custom-wallet-btn-wrapper transition-transform hover:scale-105 active:scale-95 duration-200">
                  <WalletMultiButton style={{ backgroundColor: '#3c315b', border: '2px solid #ab9ff2', borderRadius: '50px', height: '64px', padding: '0 40px', fontSize: '18px', fontFamily: "'Andale Mono', monospace", color: '#d6cbc2', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      Link Wallet
                  </WalletMultiButton>
                </div>
                <span className="text-xs tracking-widest opacity-60">Solana only</span>
            </div>
          )}

          {(state === 'CONNECTED' || state === 'LOADING') && (
            <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleDaka}
                  disabled={state === 'LOADING'}
                  className={`h-[64px] px-16 rounded-full text-xl tracking-[0.1em] transition-all duration-200 transform hover:scale-105 active:scale-95 whitespace-nowrap ${state === 'LOADING' ? 'opacity-50 cursor-wait' : ''}`}
                  style={{
                      backgroundColor: '#834e00',
                      border: '2px solid #f39800',
                      color: '#d6cbc2',
                      boxShadow: '0 0 30px rgba(131, 78, 0, 0.5)'
                  }}
                >
                  {state === 'LOADING' ? '...' : 'DAKA'}
                </button>
                <div className="text-xs tracking-widest opacity-60">
                   {globalCount} / {targetCount}
                </div>
            </div>
          )}

          {state === 'RECORDED_TODAY' && (
            <div className="flex flex-col items-center gap-4">
                <button disabled className="h-[64px] px-16 rounded-full text-xl tracking-[0.1em] cursor-not-allowed whitespace-nowrap" style={{ backgroundColor: '#262626', border: '2px solid #404040', color: '#525252' }}>
                  Recorded
                </button>
                <div className="text-xs tracking-widest opacity-60">
                  {globalCount} / {targetCount}
                </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 z-20 pb-4 md:pb-0">
          {connected && publicKey && (
             <div className="mb-2 flex items-center gap-3 text-sm tracking-widest opacity-80 font-mono">
                 {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                 <button onClick={() => {navigator.clipboard.writeText(publicKey.toBase58()); toast.success('Copied')}} className="hover:text-white transition-colors">❐</button>
             </div>
          )}
           <button onClick={() => setShowRules(true)} className="text-xs uppercase tracking-widest hover:text-white transition-colors opacity-50 mb-1">[ Rules ]</button>
          <div className="text-xs tracking-widest opacity-50 text-center px-4 leading-relaxed">© 2025 by Dakk. All rights reserved!</div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-4" onClick={() => setShowRules(false)}>
            <div className="bg-black p-8 md:p-10 max-w-sm w-full shadow-2xl relative" style={{ border: '1px solid #404040', color: '#d6cbc2' }} onClick={e => e.stopPropagation()}>
                <div className="absolute top-4 right-4 cursor-pointer opacity-50 hover:opacity-100 p-2" onClick={() => setShowRules(false)}>✕</div>
                <h3 className="text-sm mb-8 tracking-[0.2em] uppercase text-[#f39800]">Protocol Rules</h3>
                <ul className="space-y-6 text-xs leading-relaxed tracking-wider opacity-80">
                    <li className="flex gap-4"><span className="text-[#f39800] shrink-0">01.</span><span>One daka per wallet / UTC day.</span></li>
                    <li className="flex gap-4"><span className="text-[#f39800] shrink-0">02.</span><span>No retries. Miss a day, miss it forever.</span></li>
                    <li className="flex gap-4"><span className="text-[#f39800] shrink-0">03.</span><span>Min 0.01 SOL + Active History required.</span></li>
                </ul>
            </div>
        </div>
      )}
    </main>
  )
}