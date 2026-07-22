import { useEffect } from 'react';
import { useAppDispatch } from '../../infrastructure/store/store';
import { supabase } from '../../infrastructure/supabase/client';
import { setUser, fetchProfile } from '../../infrastructure/store/authSlice';

export function useAuthSession() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(fetchProfile(session.user.id)).then((action) => {
          if (fetchProfile.fulfilled.match(action)) {
            dispatch(setUser({ user: session.user, profile: action.payload }));
          } else {
            dispatch(setUser({ user: session.user, profile: null }));
          }
        });
      } else {
        dispatch(setUser({ user: null, profile: null }));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        dispatch(fetchProfile(session.user.id)).then((action) => {
          if (fetchProfile.fulfilled.match(action)) {
            dispatch(setUser({ user: session.user, profile: action.payload }));
          } else {
            dispatch(setUser({ user: session.user, profile: null }));
          }
        });
      } else {
        dispatch(setUser({ user: null, profile: null }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);
}
