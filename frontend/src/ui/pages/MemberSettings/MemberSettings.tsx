import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { setUser, fetchProfile } from '../../../infrastructure/store/authSlice';
import { supabase } from '../../../infrastructure/supabase/client';
import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import styles from './MemberSettings.module.css';

// Validation Schemas
const personalInfoSchema = z.object({
  fullName: z.string().min(1, 'El nombre completo es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Debes confirmar tu nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;
type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export function MemberSettings() {
  const dispatch = useAppDispatch();
  const { user, profile, accessToken } = useAppSelector((state) => state.auth);

  // Form states
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData>({
    fullName: '',
    phone: '',
  });

  const [passwordInfo, setPasswordInfo] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Errors states
  const [personalErrors, setPersonalErrors] = useState<Partial<Record<keyof PersonalInfoData, string>>>({});
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof ChangePasswordData, string>>>({});

  // Loading states
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle show password states
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Pre-fill form when profile loads
  useEffect(() => {
    if (profile) {
      setPersonalInfo({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  // Handle changes
  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
    if (personalErrors[name as keyof PersonalInfoData]) {
      setPersonalErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordInfo((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name as keyof ChangePasswordData]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Submit handlers
  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);
    setIsSubmitting(true);
    setPersonalErrors({});

    const validation = personalInfoSchema.safeParse(personalInfo);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof PersonalInfoData, string>> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof PersonalInfoData;
        fieldErrors[path] = issue.message;
      });
      setPersonalErrors(fieldErrors);
      setIsSavingPersonal(false);
      setIsSubmitting(false);
      return;
    }

    try {
      const currentUserId = user?.id;
      if (!currentUserId) {
        throw new Error('No se encontró una sesión activa.');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: personalInfo.fullName,
          phone: personalInfo.phone,
        })
        .eq('id', currentUserId);

      if (error) throw error;

      // Update Redux state
      const profileAction = await dispatch(fetchProfile(currentUserId));
      if (fetchProfile.fulfilled.match(profileAction)) {
        dispatch(setUser({ user, profile: profileAction.payload, accessToken }));
      }

      message.success('Información personal guardada con éxito.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la información';
      message.error(msg);
    } finally {
      setIsSavingPersonal(false);
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setIsSubmitting(true);
    setPasswordErrors({});

    const validation = changePasswordSchema.safeParse(passwordInfo);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof ChangePasswordData, string>> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof ChangePasswordData;
        fieldErrors[path] = issue.message;
      });
      setPasswordErrors(fieldErrors);
      setIsSavingPassword(false);
      setIsSubmitting(false);
      return;
    }

    try {
      // Supabase updateUser only needs the new password in its API Client
      const { error } = await supabase.auth.updateUser({
        password: passwordInfo.newPassword,
      });

      if (error) throw error;

      message.success('Contraseña actualizada con éxito.');
      setPasswordInfo({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar la contraseña';
      message.error(msg);
    } finally {
      setIsSavingPassword(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles['member-settings']} role="main">
      {isSubmitting && <LoadingScreen message="Guardando cambios..." />}
      <header className={styles['member-settings__header']}>
        <h1 className={styles['member-settings__title']}>Configuración</h1>
        <p className={styles['member-settings__subtitle']}>
          Administra tu información personal y la seguridad de tu cuenta.
        </p>
      </header>

      <div className={styles['member-settings__layout']}>
        
        {/* Card: Personal Info */}
        <section className={styles['member-settings__card']} aria-labelledby="personal-info-title">
          <h2 id="personal-info-title" className={styles['member-settings__card-title']}>
            Información Personal
          </h2>
          
          <form className={styles['member-settings__form']} onSubmit={handlePersonalSubmit} noValidate>
            
            <div className={styles['member-settings__field']}>
              <label htmlFor="fullName" className={styles['member-settings__label']}>
                Nombre Completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className={`${styles['member-settings__input']} ${
                  personalErrors.fullName ? styles['member-settings__input--error'] : ''
                }`}
                placeholder="Ingresa tu nombre"
                value={personalInfo.fullName}
                onChange={handlePersonalChange}
                disabled={isSavingPersonal}
              />
              {personalErrors.fullName && (
                <span className={styles['member-settings__error-message']}>{personalErrors.fullName}</span>
              )}
            </div>

            <div className={styles['member-settings__field']}>
              <label htmlFor="phone" className={styles['member-settings__label']}>
                Teléfono
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className={`${styles['member-settings__input']} ${
                  personalErrors.phone ? styles['member-settings__input--error'] : ''
                }`}
                placeholder="Ingresa tu teléfono"
                value={personalInfo.phone}
                onChange={handlePersonalChange}
                disabled={isSavingPersonal}
              />
              {personalErrors.phone && (
                <span className={styles['member-settings__error-message']}>{personalErrors.phone}</span>
              )}
            </div>

            <div className={styles['member-settings__field']}>
              <label htmlFor="email" className={styles['member-settings__label']}>
                Correo Electrónico (Solo Lectura)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`${styles['member-settings__input']} ${styles['member-settings__input--readonly']}`}
                value={profile?.email || user?.email || ''}
                readOnly
              />
            </div>

            <button
              type="submit"
              className={`${styles['member-settings__button']} ${styles['member-settings__button--primary']}`}
              disabled={isSavingPersonal}
            >
              {isSavingPersonal ? 'Guardando...' : 'Guardar Información'}
            </button>
          </form>
        </section>

        {/* Card: Change Password */}
        <section className={styles['member-settings__card']} aria-labelledby="security-title">
          <h2 id="security-title" className={styles['member-settings__card-title']}>
            Seguridad
          </h2>
          
          <form className={styles['member-settings__form']} onSubmit={handlePasswordSubmit} noValidate>
            
            <div className={styles['member-settings__field']}>
              <label htmlFor="currentPassword" className={styles['member-settings__label']}>
                Contraseña Actual
              </label>
              <div className={styles['member-settings__password-container']}>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPass ? 'text' : 'password'}
                  className={`${styles['member-settings__input']} ${
                    passwordErrors.currentPassword ? styles['member-settings__input--error'] : ''
                  }`}
                  placeholder="••••••••"
                  value={passwordInfo.currentPassword}
                  onChange={handlePasswordChange}
                  disabled={isSavingPassword}
                />
                <button
                  type="button"
                  className={styles['member-settings__password-toggle']}
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  aria-label={showCurrentPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showCurrentPass ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <span className={styles['member-settings__error-message']}>{passwordErrors.currentPassword}</span>
              )}
            </div>

            <div className={styles['member-settings__field']}>
              <label htmlFor="newPassword" className={styles['member-settings__label']}>
                Nueva Contraseña
              </label>
              <div className={styles['member-settings__password-container']}>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPass ? 'text' : 'password'}
                  className={`${styles['member-settings__input']} ${
                    passwordErrors.newPassword ? styles['member-settings__input--error'] : ''
                  }`}
                  placeholder="Mínimo 8 caracteres"
                  value={passwordInfo.newPassword}
                  onChange={handlePasswordChange}
                  disabled={isSavingPassword}
                />
                <button
                  type="button"
                  className={styles['member-settings__password-toggle']}
                  onClick={() => setShowNewPass(!showNewPass)}
                  aria-label={showNewPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showNewPass ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <span className={styles['member-settings__error-message']}>{passwordErrors.newPassword}</span>
              )}
            </div>

            <div className={styles['member-settings__field']}>
              <label htmlFor="confirmPassword" className={styles['member-settings__label']}>
                Confirmar Nueva Contraseña
              </label>
              <div className={styles['member-settings__password-container']}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPass ? 'text' : 'password'}
                  className={`${styles['member-settings__input']} ${
                    passwordErrors.confirmPassword ? styles['member-settings__input--error'] : ''
                  }`}
                  placeholder="Repite la contraseña"
                  value={passwordInfo.confirmPassword}
                  onChange={handlePasswordChange}
                  disabled={isSavingPassword}
                />
                <button
                  type="button"
                  className={styles['member-settings__password-toggle']}
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  aria-label={showConfirmPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPass ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <span className={styles['member-settings__error-message']}>{passwordErrors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className={`${styles['member-settings__button']} ${styles['member-settings__button--primary']}`}
              disabled={isSavingPassword}
            >
              {isSavingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        </section>
        
      </div>
    </div>
  );
}

export default MemberSettings;
