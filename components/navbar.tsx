"use client";

import { createClient } from "@/utils/supabase/client";
import { AuthError, User } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const [isOrdersOpen, setOrdersOpen] = useState(false);
  const [ordersTimeoutId, setOrdersTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );
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
    setOrdersOpen(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  const handleOrdersMouseEnter = () => {
    if (ordersTimeoutId) {
      clearTimeout(ordersTimeoutId);
      setOrdersTimeoutId(null);
    }
    setOrdersOpen(true);
  };

  const handleOrdersMouseLeave = () => {
    const timeoutId = setTimeout(() => {
      setOrdersOpen(false);
    }, 150);
    setOrdersTimeoutId(timeoutId);
  };

  const ordersHandler = () => {
    setOrdersOpen((prev) => !prev);
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
          <li role="menuitem" className="relative">
            <button
              className="hover:bg-[#041b3d] flex p-2 rounded w-full text-left justify-between items-center"
              onClick={ordersHandler}
            >
              Major Orders{" "}
              <span
                className={`transform transition-transform duration-200 ${
                  isOrdersOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {isOrdersOpen && (
              <ul className="mt-2 ml-4 space-y-1 bg-[#001225] rounded p-2">
                <li>
                  <Link
                    href={"/orders"}
                    className="hover:bg-[#041b3d] block p-2 rounded text-sm transition-colors"
                    onClick={() => {
                      setOpen(false);
                      setOrdersOpen(false);
                    }}
                  >
                    All Orders
                  </Link>
                </li>
                <li>
                  <Link
                    href="/orders/current"
                    className="hover:bg-[#041b3d] block p-2 rounded text-sm transition-colors"
                    onClick={() => {
                      setOpen(false);
                      setOrdersOpen(false);
                    }}
                  >
                    Current - Raw
                  </Link>
                </li>
              </ul>
            )}
          </li>
          <li role="menuitem">
            <Link href={"/supplyLines"} className="hover:bg-[#041b3d]">
              Supply Lines
            </Link>
          </li>
          <li role="menuitem">
            <Link href={"/objectives"} className="hover:bg-[#041b3d]">
              Objectives
            </Link>
          </li>
          <li role="menuitem">
            <Link href={"/values"} className="hover:bg-[#041b3d]">
              Values
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
          <div
            className="relative"
            onMouseEnter={handleOrdersMouseEnter}
            onMouseLeave={handleOrdersMouseLeave}
          >
            <Link
              href={"/orders"}
              className="hover:bg-[#4a4a4b] p-1 rounded flex items-center gap-1"
            >
              Major Orders
              <span
                className={`text-xs transform transition-transform ${
                  isOrdersOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </Link>

            {isOrdersOpen && (
              <div className="absolute top-full left-0 bg-[#010f24] border border-[#041b3d] rounded-md shadow-lg z-50 min-w-48">
                <ul className="py-2">
                  <li>
                    <Link
                      href={`/orders/current`}
                      className="block px-4 py-2 hover:bg-[#041b3d] text-sm"
                    >
                      Current - Raw
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
          <Link
            href={"/supplyLines"}
            className="hover:bg-[#4a4a4b] p-1 rounded"
          >
            Supply Lines
          </Link>
          <Link href={"/objectives"} className="hover:bg-[#4a4a4b] p-1 rounded">
            Objectives
          </Link>
          <Link href={"/values"} className="hover:bg-[#4a4a4b] p-1 rounded">
            Values
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
