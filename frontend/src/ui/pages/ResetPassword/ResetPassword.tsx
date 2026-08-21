import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { resetPasswordSchema, type ResetPasswordFormData } from '../../../domain/auth/auth.schema';
import { updatePassword } from '../../../application/auth/updatePassword.usecase';
import styles from './ResetPassword.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

export function ResetPassword() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ResetPasswordFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setSuccess(false);

    const validation = resetPasswordSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof ResetPasswordFormData, string>> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof ResetPasswordFormData;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(formData.password);
    setIsSubmitting(false);

    if (!result.success) {
      setGeneralError(result.error || 'No se pudo restablecer la contraseña');
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    }
  };

  return (
    <div className={styles['reset-password']} role="main">
      <div className={styles['reset-password__container']}>
        <div className={styles['reset-password__brand']}>
          <img 
            src={platinumLogo} 
            alt="Platinum Center Logo" 
            className={styles['reset-password__logo-image']}
          />
          <h1 className={styles['reset-password__logo']}>PLATINUM CENTER</h1>
          <p className={styles['reset-password__subtitle']}>Gestión integral de membresías y acceso</p>
        </div>

        <div className={styles['reset-password__card']}>
          <h2 className={styles['reset-password__title']}>Nueva Contraseña</h2>
          <p className={styles['reset-password__description']}>
            Ingresa tu nueva contraseña para completar el restablecimiento de tu cuenta.
          </p>

          <form className={styles['reset-password__form']} onSubmit={handleSubmit} noValidate>
            {success && (
              <div className={`${styles['reset-password__alert']} ${styles['reset-password__alert--success']}`} role="status">
                Contraseña restablecida exitosamente. Redirigiendo a inicio de sesión...
              </div>
            )}

            {generalError && (
              <div className={styles['reset-password__alert']} role="alert">
                {generalError}
              </div>
            )}

            {/* Field: New Password */}
            <div className={styles['reset-password__field']}>
              <label htmlFor="reset-password" className={styles['reset-password__label']}>
                Nueva Contraseña
              </label>
              <div className={styles['reset-password__password-container']}>
                <input
                  id="reset-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles['reset-password__input']} ${
                    errors.password ? styles['reset-password__input--error'] : ''
                  }`}
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting || success}
                />
                <button
                  type="button"
                  className={styles['reset-password__password-toggle']}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {errors.password && (
                <span className={styles['reset-password__error-message']}>{errors.password}</span>
              )}
            </div>

            {/* Field: Confirm Password */}
            <div className={styles['reset-password__field']}>
              <label htmlFor="reset-confirmPassword" className={styles['reset-password__label']}>
                Confirmar Contraseña
              </label>
              <div className={styles['reset-password__password-container']}>
                <input
                  id="reset-confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`${styles['reset-password__input']} ${
                    errors.confirmPassword ? styles['reset-password__input--error'] : ''
                  }`}
                  placeholder="Repite la nueva contraseña"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting || success}
                />
                <button
                  type="button"
                  className={styles['reset-password__password-toggle']}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className={styles['reset-password__error-message']}>{errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className={styles['reset-password__button']}
              disabled={isSubmitting || success}
            >
              {isSubmitting ? 'Guardando...' : 'Restablecer Contraseña'}
            </button>
          </form>

          <div className={styles['reset-password__footer']}>
            <button
              type="button"
              className={styles['reset-password__link']}
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

export default ResetPassword;
