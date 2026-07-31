import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getUserProfile } from "../services/authService";
import type { Profile } from "../types/profile";

const AuthContext = createContext<any>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadSession() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        try {
          const userProfile = await getUserProfile();

          setProfile(userProfile);
        } catch (error) {
          console.error("PROFILE ERROR:", error);
        }
      }

    } catch (error) {
      console.error("AUTH ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProfile(null);

      if (session?.user) {
        void getUserProfile()
          .then(setProfile)
          .catch((error) => console.error("PROFILE ERROR:", error));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
