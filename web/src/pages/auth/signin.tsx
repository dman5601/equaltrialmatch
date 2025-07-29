// web/src/pages/auth/signin.tsx
import { getCsrfToken } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import type { GetServerSidePropsContext, NextPage } from "next";

type SignInProps = {
  csrfToken: string;
};

const errorMessages: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  default: "Sign in failed. Please try again.",
};

const SignIn: NextPage<SignInProps> = ({ csrfToken }) => {
  const router = useRouter();
  const { error } = router.query;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const key = Array.isArray(error) ? error[0] : error;
      setErrorMsg(errorMessages[key] || errorMessages.default);
    }
  }, [error]);

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}
      <form method="post" action="/api/auth/callback/credentials" className="space-y-4">
        <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
        <div>
          <label className="block">Email</label>
          <input
            name="email"
            type="email"
            className="input w-full"
            required
          />
        </div>
        <div>
          <label className="block">Password</label>
          <input
            name="password"
            type="password"
            className="input w-full"
            required
          />
        </div>
        <button type="submit" className="btn w-full">
          Sign In
        </button>
      </form>
      <p className="mt-4 text-center">
        Don’t have an account?{' '}
        <Link href="/auth/signup" className="text-blue-500">
          Sign Up
        </Link>
      </p>
    </div>
  );
};

export default SignIn;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const csrfToken = await getCsrfToken(context);
  return {
    props: { csrfToken },
  };
}
