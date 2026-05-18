import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { cn } from '../lib/cn'

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ text: error.message, type: 'error' })
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage({ text: error.message, type: 'error' })
      else setMessage({ text: 'Check your email for a confirmation link!', type: 'success' })
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) setMessage({ text: error.message, type: 'error' })
  }

  const inputClass = cn(
    'w-full rounded-[10px] border border-[#2a2a2a] bg-[#111] px-4 py-3.5',
    'text-[0.95rem] text-white outline-none transition-colors placeholder:text-[#555]',
    'focus:border-[#555]',
  )

  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-black font-sans">
      <div className="flex w-full max-w-[380px] flex-col gap-7 rounded-[20px] border border-[#1e1e1e] bg-[#0a0a0a] px-9 py-10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[10px] bg-white text-sm font-bold tracking-tight text-black">Rx</div>
          <div>
            <div className="text-xl font-semibold tracking-tight text-white">Rxdio</div>
            <div className="mt-px text-xs text-[#555]">Global Radio Streaming</div>
          </div>
        </div>

        <div className="flex gap-5 border-b border-[#1e1e1e]">
          {(['login', 'signup'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { setMode(tab); setMessage(null) }}
              className={cn(
                'cursor-pointer border-b-2 pb-2.5 text-[0.95rem] font-medium transition-colors',
                mode === tab ? 'border-white text-white' : 'border-transparent text-[#555]',
              )}
            >
              {tab === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input className={inputClass} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />

          {message && (
            <div className={cn(
              'rounded-lg px-3.5 py-2.5 text-[0.82rem]',
              message.type === 'error'
                ? 'border border-red-500/20 bg-red-500/10 text-red-400'
                : 'border border-green-500/20 bg-green-500/10 text-green-400',
            )}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full cursor-pointer rounded-[10px] bg-white py-3.5 text-[0.95rem] font-semibold text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#1e1e1e]" />
          <span className="text-[0.8rem] text-[#444]">or</span>
          <div className="h-px flex-1 bg-[#1e1e1e]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border border-[#2a2a2a] py-3.5 text-[0.95rem] font-medium text-[#ccc] transition-colors hover:border-[#555] hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2L31.8 34C29.8 35.6 27 36.5 24 36.5 18.8 36.5 14.4 33.2 12.7 28.5L6.1 33.6C9.5 39.5 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.6 4.8C41.6 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
