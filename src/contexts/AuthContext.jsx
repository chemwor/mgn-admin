import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from backend
  const fetchProfile = async (accessToken) => {
    try {
      const { data } = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (data.success) {
        setProfile(data.data);
      }
    } catch (err) {
      // If the token is stale (user deleted), sign out so a fresh login can proceed
      if (err.response?.status === 401) {
        await supabase.auth.signOut();
        setSession(null);
      }
      setProfile(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.access_token) {
        fetchProfile(s.access_token).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.access_token) {
        fetchProfile(s.access_token);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const completeSignup = async (data) => {
    if (!session?.access_token) return { error: "Not authenticated" };
    try {
      const res = await api.post("/api/auth/complete-signup", data, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.data.success) {
        setProfile(res.data.data);
        return { error: null };
      }
      return { error: res.data.error };
    } catch (err) {
      return { error: err.response?.data?.error || "Signup failed" };
    }
  };

  const refreshProfile = async () => {
    if (session?.access_token) {
      await fetchProfile(session.access_token);
    }
  };

  const authHeaders = () =>
    session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};

  const value = {
    session,
    profile,
    loading,
    signInWithMagicLink,
    signInWithGoogle,
    signOut,
    completeSignup,
    refreshProfile,
    authHeaders,
    isAuthenticated: !!session,
    hasProfile: !!profile,
    roles: profile?.roles || [],
    hasRole: (r) => (profile?.roles || []).includes(r),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
