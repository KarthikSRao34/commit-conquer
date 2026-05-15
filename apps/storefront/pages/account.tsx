

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const API = "/api/store";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function AccountPage() {
  const [mode, setMode] = useState<"login" | "register" | "dashboard">("login");
  const [customer, setCustomer] = useState<any>(null);
  const [token, setToken]       = useState<string | null>(localStorage.getItem("cc_token"));
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ email: "", password: "", first_name: "", last_name: "" });
  const googleBtnRef = useRef<HTMLDivElement>(null);

  
  if (token && !customer && mode !== "dashboard") {
    
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.customer) { setCustomer(data.customer); setMode("dashboard"); }
        else { localStorage.removeItem("cc_token"); setToken(null); }
      })
      .catch(() => { localStorage.removeItem("cc_token"); setToken(null); });
  }

  
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || mode === "dashboard") return;

    const initGIS = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        if (googleBtnRef.current) {
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: 320,
            text: "signin_with",
            shape: "rectangular",
          });
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGIS();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGIS;
      document.head.appendChild(script);
      return () => { document.head.removeChild(script); };
    }
  }, [mode]);

  const handleGoogleResponse = async (response: any) => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Google sign-in failed");
      localStorage.setItem("cc_token", data.token);
      setToken(data.token);
      setCustomer(data.customer);
      setMode("dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? `${API}/auth/login` : `${API}/auth/register`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Something went wrong");
      localStorage.setItem("cc_token", data.token);
      setToken(data.token);
      setCustomer(data.customer);
      setMode("dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("cc_token");
    setToken(null); setCustomer(null); setMode("login");
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  if (mode === "dashboard" && customer) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <h1 style={s.title}>Hey, {customer.first_name || customer.email} 👋</h1>
              <p style={{ color: "#888", marginTop: 4 }}>{customer.email}</p>
            </div>
            <button onClick={logout} style={s.logoutBtn}>Log out</button>
          </div>

          <div style={s.infoGrid}>
            {[
              { label: "Account ID", value: customer.id },
              { label: "Email", value: customer.email },
              { label: "Name", value: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "—" },
              { label: "Phone", value: customer.phone || "—" },
            ].map((row) => (
              <div key={row.label} style={s.infoRow}>
                <span style={{ color: "#888", fontSize: 13 }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/" style={s.btn}>Browse Products</Link>
            <Link to="/checkout" style={s.ghostBtn}>View Cart</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p style={{ color: "#888", marginBottom: 32, fontSize: 14 }}>
          {mode === "login"
            ? "Demo account: demo@example.com / demo1234"
            : "Create your commit&conquer account"}
        </p>

        {error && <div style={s.errorBox}>{error}</div>}

        {GOOGLE_CLIENT_ID && (
          <div>
            <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
            <div style={s.divider}>or continue with email</div>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && (
            <div style={s.row}>
              <input style={s.input} placeholder="First name" value={form.first_name} onChange={f("first_name")} required />
              <input style={s.input} placeholder="Last name" value={form.last_name} onChange={f("last_name")} required />
            </div>
          )}
          <input style={s.input} type="email" placeholder="Email" value={form.email} onChange={f("email")} required />
          <input style={s.input} type="password" placeholder="Password" value={form.password} onChange={f("password")} required minLength={6} />
          <button type="submit" disabled={loading} style={s.submitBtn}>
            {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          style={s.switchBtn}
        >
          {mode === "login" ? "Don't have an account? Create one →" : "Already have an account? Sign in →"}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, any> = {
  page:       { maxWidth: 500, margin: "60px auto", padding: "0 24px" },
  card:       { background: "#141417", border: "1px solid #2a2a31", borderRadius: 20, padding: "40px 40px" },
  title:      { fontSize: 28, fontWeight: 800, marginBottom: 8 },
  errorBox:   { background: "rgba(255,92,92,0.12)", border: "1px solid #ff5c5c44", borderRadius: 8, padding: "12px 16px", color: "#ff5c5c", fontSize: 14, marginBottom: 16 },
  row:        { display: "flex", gap: 12 },
  input:      { flex: 1, width: "100%", padding: "12px 16px", background: "#1c1c21", border: "1px solid #2a2a31", borderRadius: 10, color: "#e8e8f0", fontSize: 15, outline: "none" },
  divider:   { display: "flex", alignItems: "center", gap: 12, margin: "16px 0", color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  submitBtn:  { padding: "14px", background: "#7c6aff", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer" },
  switchBtn:  { marginTop: 20, background: "none", border: "none", color: "#7c6aff", cursor: "pointer", fontSize: 14, padding: 0, width: "100%", textAlign: "left" },
  infoGrid:   { display: "flex", flexDirection: "column", gap: 0, border: "1px solid #2a2a31", borderRadius: 12, overflow: "hidden" },
  infoRow:    { display: "flex", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #1c1c21", fontSize: 15 },
  logoutBtn:  { background: "none", border: "1px solid #2a2a31", color: "#888", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13 },
  btn:        { display: "inline-block", padding: "12px 24px", background: "#7c6aff", color: "#fff", textDecoration: "none", borderRadius: 10, fontWeight: 700, fontSize: 15 },
  ghostBtn:   { display: "inline-block", padding: "12px 24px", background: "none", color: "#aaa", border: "1px solid #2a2a31", textDecoration: "none", borderRadius: 10, fontSize: 15 },
};