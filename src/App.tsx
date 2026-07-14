import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Not logged in</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Welcome</h1>

      <p>{user.email}</p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}