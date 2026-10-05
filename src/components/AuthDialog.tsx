import { useState } from 'react'
import { cn } from '../lib/cn'
import { signIn } from '../services/auth'
import { Dialog } from './Dialog'

const MIN_PASSWORD = 6
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
    setMessage(null)
    if (mode === 'signup' && password !== confirm) { setMessage({ text: 'Passwords do not match.', ok: false }); return }
    setBusy(true)
    const error = await signIn(mode, email, password)
    setBusy(false)
    if (error) setMessage({ text: error, ok: false })
    // on success useSession() updates and App closes this dialog
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

    </Dialog>
  )
}
