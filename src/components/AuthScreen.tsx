import { useMemo, useState } from 'react';
import { CheckCircle2, Cloud, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuthStore } from '../store/AuthStore';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const AuthScreen = () => {
  const { signIn, signUp, requestPasswordReset, updatePassword, error, clearError } = useAuthStore();
  const recoveryParams = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, '')), []);
  const recoveryToken = recoveryParams.get('type') === 'recovery' ? recoveryParams.get('access_token') : null;
  const [mode, setMode] = useState<AuthMode>(recoveryToken ? 'reset' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (mode === 'forgot') return email.trim().includes('@');
    if (mode === 'reset') return Boolean(recoveryToken) && password.length >= 8 && password === passwordConfirmation;
    const baseValid = email.trim().includes('@') && password.length >= (mode === 'register' ? 8 : 6);
    return mode === 'login'
      ? baseValid
      : baseValid && name.trim().length >= 2 && password === passwordConfirmation;
  }, [mode, name, email, password, passwordConfirmation, recoveryToken]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage(null);
    setPasswordConfirmation('');
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
      } else if (mode === 'register') {
        const result = await signUp(name, email, password);
        if (result.requiresEmailConfirmation) {
          setMessage('Akun dibuat. Periksa email untuk konfirmasi, lalu kembali dan masuk.');
          setMode('login');
          setPassword('');
          setPasswordConfirmation('');
        }
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setMessage('Link reset password sudah dikirim. Periksa inbox dan folder spam.');
      } else if (recoveryToken) {
        await updatePassword(recoveryToken, password);
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
        setMessage('Password berhasil diperbarui. Silakan masuk dengan password baru.');
        setMode('login');
        setPassword('');
        setPasswordConfirmation('');
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
          {(mode === 'login' || mode === 'register') && (
            <div className="auth-tabs" role="tablist">
              <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Masuk</button>
              <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Buat akun</button>
            </div>
          )}

          <div className="auth-heading">
            <h2>{mode === 'login' ? 'Selamat datang kembali' : mode === 'register' ? 'Mulai ruang pribadimu' : mode === 'forgot' ? 'Pulihkan akun' : 'Buat password baru'}</h2>
            <p>{mode === 'login' ? 'Masuk dengan email dan password.' : mode === 'register' ? 'Akun ini akan menjadi pemilik seluruh datamu.' : mode === 'forgot' ? 'Kami akan mengirim link reset ke email akunmu.' : 'Gunakan minimal 8 karakter dan jangan pakai ulang password lama.'}</p>
          </div>

          <div className="auth-fields">
            {mode === 'register' && (
              <label className="auth-field"><span>Nama</span><div><UserRound size={17} /><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama yang tampil" /></div></label>
            )}
            {mode !== 'reset' && (
              <label className="auth-field"><span>Email</span><div><Mail size={17} /><input autoFocus={mode !== 'register'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" autoComplete="email" /></div></label>
            )}
            {mode !== 'forgot' && (
              <label className="auth-field">
                <span>Password</span>
                <div>
                  <LockKeyhole size={17} />
                  <input autoFocus={mode === 'reset'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'login' ? 'Minimal 6 karakter' : 'Minimal 8 karakter'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </label>
            )}
            {(mode === 'register' || mode === 'reset') && (
              <label className="auth-field"><span>Ulangi password</span><div><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Harus sama" autoComplete="new-password" onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} /></div></label>
            )}
          </div>

          {error && <div className="auth-message error" role="alert">{error}</div>}
          {message && <div className="auth-message success" role="status">{message}</div>}

          <button className="primary-button auth-submit" disabled={!canSubmit || submitting} onClick={() => void submit()}>
            {submitting ? 'Memproses…' : mode === 'login' ? 'Masuk ke Ruang' : mode === 'register' ? 'Buat akun' : mode === 'forgot' ? 'Kirim link reset' : 'Simpan password baru'}
          </button>
          {mode === 'login' && <button className="auth-link-button" onClick={() => switchMode('forgot')}>Lupa password?</button>}
          {(mode === 'forgot' || mode === 'reset') && <button className="auth-link-button" onClick={() => switchMode('login')}>Kembali ke halaman masuk</button>}
          <p className="auth-footnote">Password diproses oleh Supabase Auth dan tidak disimpan di source code aplikasi.</p>
        </div>
      </section>
    </main>
  );
};
