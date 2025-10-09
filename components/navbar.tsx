"use client";

import { createClient } from "@/utils/supabase/client";
import { AuthError, User } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const [isNavOpen, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      setUser(data.user ?? null);
      setError(error);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [user]);

  const hamburgerHandler = () => {
    setOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <nav className="relative bg-[#2d2d2e]">
      <div className="lg:hidden p-5 flex gap-3 justify-between">
        <button
          className="space-y-2"
          onClick={hamburgerHandler}
          aria-label="Toggle hamburger menu"
          aria-expanded={isNavOpen}
        >
          <span className="block h-0.5 w-8 bg-gray-600"></span>
          <span className="block h-0.5 w-8 bg-gray-600"></span>
          <span className="block h-0.5 w-8 bg-gray-600"></span>
        </button>
        {!user || error ? (
          <Link
            href="/login"
            className="hover:bg-[#4a4a4b] transition-colors rounded-md p-1"
          >
            Login
          </Link>
        ) : (
          <button
            onClick={handleLogout}
            className="cursor-pointer hover:bg-[#4a4a4b] transition-colors rounded-md p-1"
          >
            Logout
          </button>
        )}
      </div>

      {/* Mobile */}
      <div
        className={`${isNavOpen ? "flex" : "hidden"} bg-[#010f24] lg:hidden`}
      >
        <ul role="menu" className="flex flex-col px-5 gap-4 py-3">
          <li role="menuitem">
            <Link href="/" className="hover:bg-[#041b3d]">
              Home
            </Link>
          </li>
          <li role="menuitem">
            <Link href={"/orders/current"} className="hover:bg-[#041b3d]">
              Major Order
            </Link>
          </li>
          <li role="menuitem">
            <Link href={"/supplyLines"} className="hover:bg-[#041b3d]">
              Supply Lines
            </Link>
          </li>
          <li role="menuitem">
            <Link href={"/regions"} className="hover:bg-[#041b3d]">
              Regions
            </Link>
          </li>
        </ul>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex flex-row justify-between items-center px-6 py-4 bg-[#2d2d2e] text-white shadow">
        <div className="flex gap-4">
          <Link href="/" className="hover:bg-[#4a4a4b] p-1 rounded">
            Home
          </Link>

          <Link
            href={"/orders/current"}
            className="hover:bg-[#4a4a4b] p-1 rounded"
          >
            Major Order
          </Link>

          <Link
            href={"/supplyLines"}
            className="hover:bg-[#4a4a4b] p-1 rounded"
          >
            Supply Lines
          </Link>
          <Link href={"/regions"} className="hover:bg-[#41414b] p-1 rounded">
            Regions
          </Link>
        </div>
        {!user || error ? (
          <Link
            href="/login"
            className="hover:bg-[#4a4a4b] transition-colors rounded-md p-1"
          >
            Login
          </Link>
        ) : (
          <button
            onClick={handleLogout}
            className="cursor-pointer hover:bg-[#4a4a4b] transition-colors rounded-md p-1"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
