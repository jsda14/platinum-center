import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, store } from '../../infrastructure/store/store';
import { supabase } from '../../infrastructure/supabase/client';
import { setUser, fetchProfile } from '../../infrastructure/store/authSlice';
import type { Profile } from '../../domain/member/member.types';

export function useAuthSession() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const provider = session.user.app_metadata?.provider;
        
        // Si viene de Google y no tiene teléfono → setup-profile
        if (provider === 'google' && !session.user.user_metadata?.phone) {
          // Verificar en profiles si ya completó el perfil
          supabase.from('profiles')
            .select('phone, full_name, role')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profileData }) => {
              dispatch(setUser({ 
                user: session.user, 
                profile: profileData as Profile, 
                accessToken: session.access_token 
              }));
              if (!profileData?.phone) {
                navigate('/setup-profile');
              } else {
                // Solo redirigir si estamos en /login o en la raíz
                const currentPath = window.location.pathname;
                if (currentPath === '/login' || currentPath === '/') {
                  const role = profileData?.role;
                  if (role === 'super_admin') {
                    navigate('/admin');
                  } else if (role === 'receptionist') {
                    navigate('/reception');
                  } else {
                    navigate('/portal');
                  }
                }
                // Si está en otra ruta, no redirigir — dejar al usuario donde está
              }
            });
          return;
        }

        // Flujo normal
        dispatch(fetchProfile(session.user.id)).then((action) => {
          if (fetchProfile.fulfilled.match(action)) {
            dispatch(setUser({ user: session.user, profile: action.payload, accessToken: session.access_token }));
          } else {
            dispatch(setUser({ user: session.user, profile: null, accessToken: session.access_token }));
          }
        });
      } else {
        dispatch(setUser({ user: null, profile: null, accessToken: null }));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/setup-profile');
        return;
      }

      if (session?.user) {
        const currentUser = store.getState().auth.user;
        const currentProfile = store.getState().auth.profile;

        if (session.user.id !== currentUser?.id) {
          dispatch(fetchProfile(session.user.id)).then((action) => {
            if (fetchProfile.fulfilled.match(action)) {
              dispatch(setUser({ user: session.user, profile: action.payload, accessToken: session.access_token }));
            } else {
              dispatch(setUser({ user: session.user, profile: null, accessToken: session.access_token }));
            }
          });
        } else {
          dispatch(setUser({ user: session.user, profile: currentProfile, accessToken: session.access_token }));
        }
      } else {
        dispatch(setUser({ user: null, profile: null, accessToken: null }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, navigate]);
}
