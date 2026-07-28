import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { setUser, fetchProfile } from '../../../infrastructure/store/authSlice';
import { supabase } from '../../../infrastructure/supabase/client';
import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import styles from './SetupProfile.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

// Validation Schema using Zod
const setupProfileSchema = z.object({
  fullName: z.string().min(1, 'El nombre completo es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Debes confirmar tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

type SetupProfileFormData = z.infer<typeof setupProfileSchema>;

export function SetupProfile() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Get existing auth state to pre-fill fullName if possible
  const { profile, user } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<SetupProfileFormData>({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SetupProfileFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch profile to pre-fill name and phone
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || user?.id;
        if (!currentUserId) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', currentUserId)
          .single();

        if (error) throw error;

        if (data) {
          setFormData((prev) => ({
            ...prev,
            fullName: data.full_name || '',
            phone: data.phone || ''
          }));
        }
      } catch (err) {
        console.error('Error al cargar datos del perfil:', err);
      }
    };

    fetchProfileData();
  }, [user, profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof SetupProfileFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Zod validation
    const validation = setupProfileSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof SetupProfileFormData, string>> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof SetupProfileFormData;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Get current session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || user?.id;

      if (!currentUserId) {
        throw new Error('No se encontró una sesión de usuario activa.');
      }

      // 2. Update user password in Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (authError) {
        throw new Error(`Error en Auth: ${authError.message}`);
      }

      // 3. Update profile fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone
        })
        .eq('id', currentUserId);

      if (profileError) {
        throw new Error(`Error al actualizar el perfil: ${profileError.message}`);
      }

      // 4. Update Redux store
      const profileAction = await dispatch(fetchProfile(currentUserId));
      if (fetchProfile.fulfilled.match(profileAction)) {
        dispatch(setUser({ user: session?.user || user, profile: profileAction.payload }));
      }

      message.success('Perfil configurado y activado exitosamente');
      navigate('/portal');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error al guardar tu perfil';
      message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles['setup-profile']} role="main">
      {isSubmitting && <LoadingScreen message="Configurando tu perfil..." />}
      <div className={styles['setup-profile__container']}>
        <div className={styles['setup-profile__brand']}>
          <img 
            src={platinumLogo} 
            alt="Platinum Center Logo" 
            className={styles['setup-profile__logo-image']}
          />
          <h1 className={styles['setup-profile__logo']}>PLATINUM CENTER</h1>
          <p className={styles['setup-profile__subtitle']}>Portal de Miembros</p>
        </div>

        <div className={styles['setup-profile__card']}>
          <h2 className={styles['setup-profile__title']}>Activar Cuenta</h2>
          <p className={styles['setup-profile__message']}>
            Bienvenido a Platinum Center. Completa tu perfil para comenzar.
          </p>

          <form className={styles['setup-profile__form']} onSubmit={handleSubmit} noValidate>
            
            {/* Field: Full Name */}
            <div className={styles['setup-profile__field']}>
              <label htmlFor="fullName" className={styles['setup-profile__label']}>
                Nombre Completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className={`${styles['setup-profile__input']} ${
                  errors.fullName ? styles['setup-profile__input--error'] : ''
                }`}
                placeholder="Ej. Juan Pérez"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.fullName && (
                <span className={styles['setup-profile__error-message']}>{errors.fullName}</span>
              )}
            </div>

            {/* Field: Phone */}
            <div className={styles['setup-profile__field']}>
              <label htmlFor="phone" className={styles['setup-profile__label']}>
                Teléfono
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className={`${styles['setup-profile__input']} ${
                  errors.phone ? styles['setup-profile__input--error'] : ''
                }`}
                placeholder="Ej. 3001234567"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.phone && (
                <span className={styles['setup-profile__error-message']}>{errors.phone}</span>
              )}
            </div>

            {/* Field: Password */}
            <div className={styles['setup-profile__field']}>
              <label htmlFor="password" className={styles['setup-profile__label']}>
                Nueva Contraseña
              </label>
              <div className={styles['setup-profile__password-container']}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles['setup-profile__input']} ${
                    errors.password ? styles['setup-profile__input--error'] : ''
                  }`}
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className={styles['setup-profile__password-toggle']}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {errors.password && (
                <span className={styles['setup-profile__error-message']}>{errors.password}</span>
              )}
            </div>

            {/* Field: Confirm Password */}
            <div className={styles['setup-profile__field']}>
              <label htmlFor="confirmPassword" className={styles['setup-profile__label']}>
                Confirmar Contraseña
              </label>
              <div className={styles['setup-profile__password-container']}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`${styles['setup-profile__input']} ${
                    errors.confirmPassword ? styles['setup-profile__input--error'] : ''
                  }`}
                  placeholder="Repite la contraseña"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className={styles['setup-profile__password-toggle']}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className={styles['setup-profile__error-message']}>{errors.confirmPassword}</span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`${styles['setup-profile__button']} ${styles['setup-profile__button--primary']}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando perfil...' : 'Guardar y Continuar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default SetupProfile;
