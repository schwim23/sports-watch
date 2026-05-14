import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="container">
      <div className="card focus-card">
        <span className="tag">MLB · Live · Schedule</span>
        <h1>sports-watch</h1>
        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          Track your teams. Know exactly where every game is on.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/home" });
          }}
        >
          <button type="submit" style={{ width: "100%" }}>
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
