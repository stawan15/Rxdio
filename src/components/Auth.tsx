import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { cn } from '../lib/cn'

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const redirectTo = import.meta.env.PROD
    ? (import.meta.env.VITE_SITE_URL ?? 'https://rxdio.teveus.xyz')
    : window.location.origin

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        let msg = error.message
        if (error.message.toLowerCase().includes('confirm')) {
          msg = 'Please check your inbox (and spam folder) to confirm your email link, or disable email confirmation in your Supabase dashboard.'
        }
        setMessage({ text: msg, type: 'error' })
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage({ text: error.message, type: 'error' })
      } else {
        setMessage({
          text: 'Account created successfully! Please check your email inbox (and spam folder) for a confirmation link.',
          type: 'success',
        })
      }
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) setMessage({ text: error.message, type: 'error' })
  }

  const inputClass = cn(
    'w-full rounded-[12px] border border-white/10 bg-black/40 px-4 py-3.5',
    'text-[0.95rem] text-white outline-none transition-all placeholder:text-[#555]',
    'focus:border-white/30 focus:bg-black/60 focus:ring-1 focus:ring-white/20',
  )

  return (
    <div className="relative flex h-dvh w-screen items-center justify-center bg-black font-sans overflow-hidden">
      {/* Premium Ambient Shifting Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#00ff88]/10 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-pink-500/10 blur-[130px] animate-[pulse_10s_ease-in-out_infinite_1s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[150px]" />

      <div className="relative z-10 flex w-full max-w-[420px] flex-col gap-6 rounded-[24px] border border-white/10 bg-[#0a0a0a]/60 px-8 py-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-[14px] bg-white text-base font-black tracking-tighter text-black shadow-lg">
            Rx
          </div>
          <div className="mt-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome to Rxdio</h2>
            <p className="mt-1.5 text-xs text-foreground-muted max-w-[280px]">
              Explore live global radio stations on an interactive 3D globe
            </p>
          </div>
        </div>

        <div className="flex gap-4 border-b border-white/5">
          {(['login', 'signup'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { setMode(tab); setMessage(null) }}
              className={cn(
                'cursor-pointer border-b-2 pb-2 text-[0.9rem] font-semibold transition-all duration-200',
                mode === tab ? 'border-white text-white' : 'border-transparent text-[#555] hover:text-white/60',
              )}
            >
              {tab === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className={inputClass}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {message && (
            <div className={cn(
              'rounded-xl px-4 py-3.5 text-[0.8rem] leading-relaxed border',
              message.type === 'error'
                ? 'border-red-500/20 bg-red-500/10 text-red-400'
                : 'border-green-500/20 bg-green-500/10 text-green-400',
            )}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'mt-2 w-full cursor-pointer rounded-[12px] bg-white py-3.5 text-[0.95rem] font-bold text-black shadow-md',
              'transition-all duration-200 hover:bg-neutral-100 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40'
            )}
          >
            {loading ? (
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[0.75rem] text-white/20 uppercase tracking-widest font-semibold">or</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[12px] border border-white/10 bg-white/5 py-3.5 text-[0.9rem] font-medium text-white transition-all duration-200 hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2L31.8 34C29.8 35.6 27 36.5 24 36.5 18.8 36.5 14.4 33.2 12.7 28.5L6.1 33.6C9.5 39.5 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.6 4.8C41.6 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
          Continue with Google
        </button>

        {mode === 'signup' && (
          <p className="text-[11px] text-center text-[#555] leading-relaxed">
            Note: If you don't receive verification emails, make sure SMTP is configured in your Supabase dashboard under Authentication > Providers > Email.
          </p>
        )}
      </div>
    </div>
  )
}

  )
}
