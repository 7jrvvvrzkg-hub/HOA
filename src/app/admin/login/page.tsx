import { Logo } from "@/components/logo";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { LoginForm } from "./login-form";

export const metadata = { title: "Owner Login" };

export default function AdminLoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-cloud p-8 shadow-soft">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center font-display text-xl">Owner sign-in</h1>
        <p className="mb-6 text-center text-xs text-ink-soft">
          This area is for the shop owner only.
        </p>
        <LoginForm showEmailField={configured} />
        {!configured && (
          <p className="mt-4 text-center text-xs text-ink-soft/70">
            Demo mode — password is set via <code>ADMIN_DEMO_PASSWORD</code>. Connect Supabase
            for real owner authentication.
          </p>
        )}
      </div>
    </div>
  );
}
