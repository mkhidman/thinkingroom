import { useMemo, useState } from 'react';
import { CheckCircle2, Cloud, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuthStore } from '../store/AuthStore';

export const AuthScreen = () => {
  const { signIn, signUp, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const baseValid = email.trim().includes('@') && password.length >= 6;
    return mode === 'login' ? baseValid : baseValid && name.trim().length >= 2;
  }, [mode, name, email, password]);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setMessage(null);
    clearError();
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setMessage(null);
    clearError();
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        const result = await signUp(name, email, password);
        if (result.requiresEmailConfirmation) {
          setMessage('Akun dibuat. Periksa email untuk konfirmasi, lalu kembali dan masuk.');
          setMode('login');
          setPassword('');
        }
      }
    } catch {
      // Pesan error sudah disimpan oleh AuthStore dan ditampilkan di form.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="auth-brand"><span>R</span><div><strong>Ruang</strong><small>Personal Life OS</small></div></div>
        <div className="auth-copy">
          <span className="eyebrow light"><Cloud size={15} /> Sinkronisasi pribadi</span>
          <h1>Satu ruang yang tetap sama di ponsel dan laptop.</h1>
          <p>Masuk untuk menyimpan tugas, rutinitas, catatan, ibadah, dan keuangan secara aman di akunmu.</p>
        </div>
        <div className="auth-benefits">
          <div><CheckCircle2 size={17} /><span>Data dipisahkan per pengguna dengan Row Level Security.</span></div>
          <div><CheckCircle2 size={17} /><span>Perubahan disimpan lokal terlebih dahulu lalu disinkronkan.</span></div>
          <div><CheckCircle2 size={17} /><span>Tetap dapat dibuka sebagai PWA dari layar utama.</span></div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Masuk</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Buat akun</button>
          </div>

          <div className="auth-heading">
            <h2>{mode === 'login' ? 'Selamat datang kembali' : 'Mulai ruang pribadimu'}</h2>
            <p>{mode === 'login' ? 'Masuk dengan email dan password.' : 'Akun ini akan menjadi pemilik seluruh datamu.'}</p>
          </div>

          <div className="auth-fields">
            {mode === 'register' && (
              <label className="auth-field"><span>Nama</span><div><UserRound size={17} /><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama yang tampil" /></div></label>
            )}
            <label className="auth-field"><span>Email</span><div><Mail size={17} /><input autoFocus={mode === 'login'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" autoComplete="email" /></div></label>
            <label className="auth-field"><span>Password</span><div><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 6 karakter" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          </div>

          {error && <div className="auth-message error">{error}</div>}
          {message && <div className="auth-message success">{message}</div>}

          <button className="primary-button auth-submit" disabled={!canSubmit || submitting} onClick={() => void submit()}>
            {submitting ? 'Memproses…' : mode === 'login' ? 'Masuk ke Ruang' : 'Buat akun'}
          </button>
          <p className="auth-footnote">Password diproses oleh Supabase Auth dan tidak disimpan di source code aplikasi.</p>
        </div>
      </section>
    </main>
  );
};
