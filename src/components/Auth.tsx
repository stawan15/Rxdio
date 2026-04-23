import { useState } from 'react'
import { supabase } from '../services/supabaseClient'

export const Auth = () => {
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

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        html, body { margin: 0; padding: 0; background: #000; }
        * { box-sizing: border-box; }
        .auth-input {
          width: 100%;
          padding: 13px 16px;
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .auth-input:focus { border-color: #555; }
        .auth-input::placeholder { color: #555; }
        .auth-btn-primary {
          width: 100%;
          padding: 13px;
          background: #fff;
          color: #000;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .auth-btn-primary:hover { opacity: 0.85; }
        .auth-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .auth-btn-google {
          width: 100%;
          padding: 13px;
          background: transparent;
          color: #ccc;
          border: 1px solid #2a2a2a;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: border-color 0.2s, color 0.2s;
        }
        .auth-btn-google:hover { border-color: #555; color: #fff; }
        .auth-tab {
          background: transparent;
          border: none;
          font-family: inherit;
          font-size: 0.95rem;
          cursor: pointer;
          padding: 0 0 10px 0;
          transition: color 0.2s;
          font-weight: 500;
        }
      `}</style>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
        padding: '40px 36px',
        background: '#0a0a0a',
        border: '1px solid #1e1e1e',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: '#fff',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.5px'
          }}>Rx</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.3px' }}>Rxdio</div>
            <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '1px' }}>Global Radio Streaming</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #1e1e1e' }}>
          {(['login', 'signup'] as const).map(tab => (
            <button
              key={tab}
              className="auth-tab"
              onClick={() => { setMode(tab); setMessage(null) }}
              style={{
                color: mode === tab ? '#fff' : '#555',
                borderBottom: mode === tab ? '2px solid #fff' : '2px solid transparent',
              }}
            >
              {tab === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {message && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              color: message.type === 'error' ? '#f87171' : '#4ade80',
              border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
            }}>
              {message.text}
            </div>
          )}

          <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#1e1e1e' }} />
          <span style={{ color: '#444', fontSize: '0.8rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#1e1e1e' }} />
        </div>

        {/* Google */}
        <button className="auth-btn-google" onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2L31.8 34C29.8 35.6 27 36.5 24 36.5 18.8 36.5 14.4 33.2 12.7 28.5L6.1 33.6C9.5 39.5 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.6 4.8C41.6 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
