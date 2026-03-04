import { useEffect, useState, useCallback } from "react";
import { getSession, signOut, onAuthStateChange, isSupabaseConfigured } from "../services/authService";
import { User, AuthState, AuthMode } from "../types";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthState("guest");
      return;
    }

    const unsub = onAuthStateChange((changedUser) => {
      if (changedUser) {
        setUser(changedUser);
        setAuthState("authenticated");
        setShowAuth(false);
      } else {
        setUser(null);
        setAuthState("guest");
      }
    });

    getSession().then((u) => {
      if (!u) setAuthState("guest");
    });

    return unsub;
  }, []);

  const openSignIn = useCallback(() => {
    setAuthMode("signin");
    setShowAuth(true);
  }, []);

  const openSignUp = useCallback(() => {
    setAuthMode("signup");
    setShowAuth(true);
  }, []);

  const closeAuth = () => setShowAuth(false);

  const signOutUser = async () => {
    await signOut();
    setUser(null);
    setAuthState("guest");
  };

  return {
    user,
    authState,
    showAuth,
    authMode,
    openSignIn,
    openSignUp,
    closeAuth,
    signOutUser,
  };
}
