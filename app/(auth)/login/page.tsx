import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 420, margin: "4rem auto" }}>
        <h1>sports-watch</h1>
        <p className="muted">Track your teams. Know exactly where every game is on.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/home" });
          }}
        >
          <button type="submit">Sign in with Google</button>
        </form>
      </div>
    </main>
  );
}
