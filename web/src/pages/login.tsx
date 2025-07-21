import AuthForm from "../components/AuthForm";

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl mb-4">Log In</h1>
      <AuthForm mode="login" />
    </div>
  );
}
