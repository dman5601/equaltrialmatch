import AuthForm from "../components/AuthForm";

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl mb-4">Sign Up</h1>
      <AuthForm mode="signup" />
    </div>
  );
}
