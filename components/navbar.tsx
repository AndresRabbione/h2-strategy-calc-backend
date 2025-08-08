"use client";

import { createClient } from "@/utils/supabase/client";
import { AuthError, User } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      setUser(data.user ?? null);
      setError(error);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/");
  };

  return (
    <nav className="flex flex-row justify-between items-center relative px-6 py-4 bg-[#2d2d2e]">
      <div className="flex flex-row gap-4 items-center">
        <Link href="/orders" className="">
          Major Orders
        </Link>
        <Link href="/supplyLines">Supply Lines</Link>
        <Link href="/stratagems">Stratagems</Link>
      </div>
      <div>
        {!user || error ? (
          <Link href="/login">Login</Link>
        ) : (
          <button onClick={handleLogout}>Logout</button>
        )}
      </div>
    </nav>
  );
}
