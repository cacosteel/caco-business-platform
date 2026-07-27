import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getUserProfile } from "../services/authService";

const AuthContext = createContext<any>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadSession() {
    console.log("Loading auth session...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("SESSION:", session);

      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        try {
          const userProfile = await getUserProfile();

          console.log("PROFILE:", userProfile);

          setProfile(userProfile);
        } catch (error) {
          console.error("PROFILE ERROR:", error);
        }
      }

    } catch (error) {
      console.error("AUTH ERROR:", error);
    } finally {
      console.log("Setting loading false");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("AUTH CHANGE:", session);

      setUser(session?.user ?? null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}