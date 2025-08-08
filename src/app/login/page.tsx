"use client";

import { login, signup } from "./actions";
import { useActionState } from "react";

const initialState = { errors: { email: [], password: [] } };

async function formAction(
  previousState: {
    errors: { email?: string[] | undefined; password?: string[] | undefined };
  },
  formData: FormData
) {
  const actionType = formData.get("action");
  if (actionType === "signup") {
    return await signup(formData);
  }
  return await login(formData);
}

export default function LoginPage() {
  const [state, formActionHandler, pending] = useActionState(
    formAction,
    initialState
  );
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        action={formActionHandler}
        className="flex flex-col gap-3 items-center py-20 m-5 bg-[#3f3d3dc3] rounded-2xl shadow-md w-full md:w-100"
      >
        <div className="grid grid-cols-3 grid-rows-3 gap-2 items-center w-100 pl-5 pr-5">
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="border rounded-md p-1 text-black bg-gray-100 w-full col-span-2"
          />

          {state.errors.email ? (
            <div className="col-span-3">
              {state.errors.email.map((error, index) => (
                <span key={index}>- {error}</span>
              ))}
            </div>
          ) : null}

          <label htmlFor="password">Password:</label>
          <input
            id="password"
            name="password"
            type="password"
            className="border rounded-md p-1 text-black bg-gray-100 col-span-2"
            required
          />

          {state.errors.password ? (
            <div className="col-span-3">
              {state.errors.password.map((error, index) => (
                <span key={index}>- {error}</span>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          name="action"
          value="login"
          disabled={pending}
          className="uppercase rounded-xl py-2 px-4 border border-transparent text-center text-sm text-white transition-all 
            shadow-md hover:shadow-lg focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-slate-700 active:shadow-none 
            disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none bg-[#001d3d] w-35"
        >
          Log in
        </button>
        <button
          type="submit"
          name="action"
          value="signup"
          disabled={pending}
          className="uppercase rounded-xl py-2 px-4 border border-transparent text-center text-sm text-white transition-all 
            shadow-md hover:shadow-lg focus:bg-green-700 focus:shadow-none active:bg-green-700 hover:bg-green-700 active:shadow-none 
            disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none bg-green-600 w-35"
        >
          Sign up
        </button>
      </form>
    </div>
  );
}
