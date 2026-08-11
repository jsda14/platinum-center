import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPasswordSchema } from '../../../domain/auth/auth.schema';
import { resetPasswordForEmail } from '../../../application/auth/resetPasswordForEmail.usecase';
import styles from './ForgotPassword.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      const msg = validation.error.issues[0]?.message || 'Correo electrónico inválido';
      setError(msg);
      return;
    }

    setIsSubmitting(true);
    const result = await resetPasswordForEmail(email);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Error al enviar la solicitud');
    } else {
      setSuccess(true);
      setEmail('');
    }
  };

  return (
    <div className={styles['forgot-password']} role="main">
      <div className={styles['forgot-password__container']}>
        <div className={styles['forgot-password__brand']}>
          <img 
            src={platinumLogo} 
            alt="Platinum Center Logo" 
            className={styles['forgot-password__logo-image']}
          />
          <h1 className={styles['forgot-password__logo']}>PLATINUM CENTER</h1>
          <p className={styles['forgot-password__subtitle']}>Gestión integral de membresías y acceso</p>
        </div>

        <div className={styles['forgot-password__card']}>
          <h2 className={styles['forgot-password__title']}>Recuperar Contraseña</h2>
          <p className={styles['forgot-password__description']}>
            Ingresa tu correo electrónico registrado y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          <form className={styles['forgot-password__form']} onSubmit={handleSubmit} noValidate>
            {success && (
              <div className={`${styles['forgot-password__alert']} ${styles['forgot-password__alert--success']}`} role="status">
                Si este correo está registrado, recibirás un enlace para restablecer tu contraseña. Espera de 1 a 5 minutos, si no llega reintenta nuevamente.
              </div>
            )}

            {error && (
              <div className={styles['forgot-password__alert']} role="alert">
                {error}
              </div>
            )}

            <div className={styles['forgot-password__field']}>
              <label htmlFor="forgot-email" className={styles['forgot-password__label']}>
                Correo electrónico
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                className={`${styles['forgot-password__input']} ${
                  error ? styles['forgot-password__input--error'] : ''
                }`}
                placeholder="ejemplo@platinumcenter.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className={styles['forgot-password__button']}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando solicitud...' : 'Enviar enlace de recuperación'}
            </button>
          </form>

          <div className={styles['forgot-password__footer']}>
            <button
              type="button"
              className={styles['forgot-password__link']}
              onClick={() => navigate('/login')}
            >
              Volver a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
