import { useState } from 'react'
import { cn } from '../lib/cn'
import { supabase } from '../services/supabaseClient'
import { Dialog } from './Dialog'

const MIN_PASSWORD = 6
const redirectTo = import.meta.env.VITE_SITE_URL || window.location.origin

const field = 'h-12 w-full rounded-xl border border-border bg-surface-muted px-4 text-base outline-none transition-colors placeholder:text-foreground-muted focus:border-accent'

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const switchMode = (next: typeof mode) => { setMode(next); setMessage(null); setPassword(''); setConfirm('') }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setMessage(null)
    if (mode === 'signup' && password !== confirm) { setMessage({ text: 'Passwords do not match.', ok: false }); return }
    setBusy(true)
    const { data, error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
    setBusy(false)
    if (error) {
      const unconfirmed = error.message.toLowerCase().includes('confirm')
      setMessage({ text: unconfirmed ? 'Please confirm your email first — check your inbox and spam folder.' : error.message, ok: false })
    } else if (mode === 'signup' && !data.session) {
      setMessage({ text: 'Account created! Check your email to confirm it, then sign in.', ok: true })
    }
    // with a session, useSession() picks it up and App closes this dialog
  }

  const google = async () => {
    const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) setMessage({ text: error.message, ok: false })
  }

  return (
    <Dialog open={open} onClose={onClose} title={mode === 'login' ? 'Welcome back' : 'Create your account'}>
      <p className="-mt-1 mb-4 text-sm text-foreground-muted">Sign in to save favorites and build playlists. Browsing and listening never needs an account.</p>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
        {(['login', 'signup'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn('h-10 cursor-pointer rounded-lg text-sm font-semibold transition-colors', mode === m ? 'bg-surface-raised shadow-sm' : 'text-foreground-muted')}
          >
            {m === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className={field} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        <input className={field} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={MIN_PASSWORD} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        {mode === 'signup' && (
          <input className={field} type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={MIN_PASSWORD} autoComplete="new-password" />
        )}
        {message && (
          <p role="alert" className={cn('rounded-xl border px-4 py-3 text-sm', message.ok ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-red-500/30 bg-red-500/10 text-red-500')}>
            {message.text}
          </p>
        )}
        <button type="submit" disabled={busy} className="mt-1 h-12 cursor-pointer rounded-xl bg-accent font-bold text-accent-fg transition-all active:scale-[0.98] disabled:opacity-50">
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <button type="button" onClick={google} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-border bg-surface-muted font-semibold transition-all hover:border-foreground/30 active:scale-[0.98]">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2L31.8 34C29.8 35.6 27 36.5 24 36.5 18.8 36.5 14.4 33.2 12.7 28.5L6.1 33.6C9.5 39.5 16.3 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.6 4.8C41.6 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z" />
        </svg>
        Continue with Google
      </button>
    </Dialog>
  )
}
