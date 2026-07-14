import { supabase } from "../lib/supabase";

export default function Header() {

  async function logout() {
    await supabase.auth.signOut();
    location.reload();
  }

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">

      <h2 className="font-semibold text-xl">
        CACO Business Platform
      </h2>

      <button
        onClick={logout}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Logout
      </button>

    </header>
  );
}