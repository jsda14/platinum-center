import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { loginWithEmail } from '../../../infrastructure/store/authSlice';
import { supabase } from '../../../infrastructure/supabase/client';
import { loginSchema, registerSchema, type LoginFormData } from '../../../domain/auth/auth.schema';
import { registerUserByEmail } from '../../../application/auth/registerUser.usecase';
import styles from './Login.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

interface LoginProps {
  defaultMode?: 'login' | 'register';
}

export function Login({ defaultMode = 'login' }: LoginProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading: authLoading, error: authError } = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [registerEmail, setRegisterEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Errors
  const [loginErrors, setLoginErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (loginErrors[name as keyof LoginFormData]) {
      setLoginErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterEmail(e.target.value);
    if (registerError) {
      setRegisterError(null);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse(loginData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof LoginFormData;
        fieldErrors[path] = issue.message;
      });
      setLoginErrors(fieldErrors);
      return;
    }

    setLoginErrors({});
    const result = await dispatch(loginWithEmail(loginData));

    if (loginWithEmail.fulfilled.match(result)) {
      const profile = result.payload.profile;
      if (profile?.role === 'super_admin') {
        navigate('/admin');
      } else if (profile?.role === 'receptionist') {
        navigate('/reception');
      } else {
        navigate('/portal');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(false);

    const validation = registerSchema.safeParse({ email: registerEmail });
    if (!validation.success) {
      const msg = validation.error.issues[0]?.message || 'Correo inválido';
      setRegisterError(msg);
      return;
    }

    setIsRegistering(true);
    const result = await registerUserByEmail(registerEmail);
    setIsRegistering(false);

    if (!result.success) {
      setRegisterError(result.error || 'Error al procesar el registro');
    } else {
      setRegisterSuccess(true);
      setRegisterEmail('');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/portal',
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error al intentar iniciar sesión con Google';
      Modal.error({
        title: 'Error de Autenticación',
        content: msg,
        okText: 'Entendido',
        maskClosable: false,
      });
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setLoginErrors({});
    setRegisterError(null);
    setRegisterSuccess(false);
    navigate(newMode === 'login' ? '/login' : '/register', { replace: true });
  };

  const isLoading = authLoading || isRegistering;

  return (
    <div className={styles.login}>
      <div className={styles.login__container}>
        <div className={styles.login__brand}>
          <img 
            src={platinumLogo} 
            alt="Platinum Center Logo" 
            className={styles['login__logo-image']}
          />
          <h1 className={styles.login__logo}>PLATINUM CENTER</h1>
          <p className={styles.login__subtitle}>Gestión integral de membresías y acceso</p>
        </div>

        <div className={styles.login__card}>
          {mode === 'login' ? (
            <form className={styles.login__form} onSubmit={handleLoginSubmit} noValidate>
              {authError && (
                <div className={styles.login__alert} role="alert">
                  {authError}
                </div>
              )}

              <div className={styles.login__field}>
                <label htmlFor="login-email" className={styles.login__label}>
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className={`${styles.login__input} ${
                    loginErrors.email ? styles['login__input--error'] : ''
                  }`}
                  placeholder="ejemplo@platinumcenter.com"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  disabled={isLoading}
                />
                {loginErrors.email && (
                  <span className={styles['login__error-message']}>{loginErrors.email}</span>
                )}
              </div>

              <div className={styles.login__field}>
                <label htmlFor="login-password" className={styles.login__label}>
                  Contraseña
                </label>
                <div className={styles['login__password-container']}>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.login__input} ${
                      loginErrors.password ? styles['login__input--error'] : ''
                    }`}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className={styles['login__password-toggle']}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </div>
                {loginErrors.password && (
                  <span className={styles['login__error-message']}>{loginErrors.password}</span>
                )}
              </div>

              <div className={styles['login__forgot-container']}>
                <button
                  type="button"
                  className={styles['login__forgot-button']}
                  onClick={() => navigate('/forgot-password')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                className={`${styles.login__button} ${styles['login__button--primary']}`}
                disabled={isLoading}
              >
                {authLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>
          ) : (
            <form className={styles.login__form} onSubmit={handleRegisterSubmit} noValidate>
              {registerSuccess && (
                <div className={`${styles.login__alert} ${styles['login__alert--success']}`} role="status">
                  ¡Correo enviado correctamente! Si este correo no está registrado, recibirás un enlace de activación en tu bandeja de entrada.
                  Espera de 1 a 5 minutos.
                </div>
              )}

              {registerError && (
                <div className={styles.login__alert} role="alert">
                  {registerError}
                </div>
              )}

              <div className={styles.login__field}>
                <label htmlFor="register-email" className={styles.login__label}>
                  Correo electrónico para registro
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  className={`${styles.login__input} ${
                    registerError ? styles['login__input--error'] : ''
                  }`}
                  placeholder="tuemail@ejemplo.com"
                  value={registerEmail}
                  onChange={handleRegisterChange}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className={`${styles.login__button} ${styles['login__button--primary']}`}
                disabled={isLoading}
              >
                {isRegistering ? 'Enviando correo...' : 'Registrarse con Email'}
              </button>
            </form>
          )}

          <div className={styles.login__divider}>
            <span className={styles['login__divider-text']}>o continúa con</span>
          </div>

          <button
            type="button"
            className={`${styles.login__button} ${styles['login__button--google']}`}
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg
              className={styles['login__google-icon']}
              viewBox="0 0 24 24"
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>

          <div className={styles.login__toggle}>
            {mode === 'login' ? (
              <span className={styles['login__toggle-text']}>
                ¿No tienes cuenta?
                <button
                  type="button"
                  className={styles['login__toggle-button']}
                  onClick={() => switchMode('register')}
                >
                  Regístrate
                </button>
              </span>
            ) : (
              <span className={styles['login__toggle-text']}>
                ¿Ya tienes cuenta?
                <button
                  type="button"
                  className={styles['login__toggle-button']}
                  onClick={() => switchMode('login')}
                >
                  Inicia sesión
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
