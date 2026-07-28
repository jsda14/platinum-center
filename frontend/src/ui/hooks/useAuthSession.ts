import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, store } from '../../infrastructure/store/store';
import { supabase } from '../../infrastructure/supabase/client';
import { setUser, fetchProfile } from '../../infrastructure/store/authSlice';

export function useAuthSession() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
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
