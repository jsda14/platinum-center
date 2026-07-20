import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { loginWithEmail, loginWithGoogle } from '../../../infrastructure/store/authSlice';
import styles from './Login.module.css';

const loginSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es requerido').email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error: authError } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof LoginFormData;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    const result = await dispatch(loginWithEmail(formData));

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

  const handleGoogleLogin = async () => {
    await dispatch(loginWithGoogle());
  };

  return (
    <div className={styles.login}>
      <div className={styles.login__container}>
        <div className={styles.login__brand}>
          <h1 className={styles.login__logo}>PLATINUM CENTER</h1>
          <p className={styles.login__subtitle}>Gestión integral de membresías y acceso</p>
        </div>

        <div className={styles.login__card}>
          <form className={styles.login__form} onSubmit={handleSubmit} noValidate>
            {authError && (
              <div className={styles.login__alert} role="alert">
                {authError}
              </div>
            )}

            <div className={styles.login__field}>
              <label htmlFor="email" className={styles.login__label}>
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`${styles.login__input} ${
                  errors.email ? styles['login__input--error'] : ''
                }`}
                placeholder="ejemplo@platinumcenter.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.email && (
                <span className={styles['login__error-message']}>{errors.email}</span>
              )}
            </div>

            <div className={styles.login__field}>
              <label htmlFor="password" className={styles.login__label}>
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className={`${styles.login__input} ${
                  errors.password ? styles['login__input--error'] : ''
                }`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.password && (
                <span className={styles['login__error-message']}>{errors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className={`${styles.login__button} ${styles['login__button--primary']}`}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className={styles.login__divider}>
            <span className={styles['login__divider-text']}>o continúa con</span>
          </div>

          <button
            type="button"
            className={`${styles.login__button} ${styles['login__button--google']}`}
            onClick={handleGoogleLogin}
            disabled={loading}
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
        </div>
      </div>
    </div>
  );
};

export default Login;
