'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [state, setState] = useState<'DISCONNECTED' | 'CONNECTED' | 'RECORDED_TODAY'>('DISCONNECTED')
  const [count] = useState(2)

  useEffect(() => {
    if (connected) setState('CONNECTED')
    else setState('DISCONNECTED')
  }, [connected])

  const handleDaka = () => {
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