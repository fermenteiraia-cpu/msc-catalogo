import { create } from "zustand";
import type { AuthError, Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { err, ok, type AppError, type Result } from "@/lib/result";

interface AuthState {
  user: User | null;
  session: Session | null;
  /** False until the first onAuthStateChange or getSession resolves. */
  isInitialized: boolean;
  /** True while signIn / signUp / signOut is in flight. */
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<Result<null>>;
  signUp: (email: string, password: string) => Promise<Result<null>>;
  signOut: () => Promise<Result<null>>;
  /**
   * Bootstraps session state from supabase and subscribes to changes.
   * Returns an unsubscribe function that should be invoked on unmount.
   */
  initialize: () => () => void;
}

/**
 * Translates a Supabase AuthError into our AppError shape with a
 * Portuguese, user-facing message and a stable code.
 */
function mapAuthError(error: AuthError): AppError {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("invalid login credentials")) {
    return {
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Email ou senha incorretos.",
      retryable: true,
      details: error,
    };
  }
  if (
    message.includes("user already registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return {
      code: "AUTH_USER_EXISTS",
      message: "Já existe uma conta com este email.",
      retryable: false,
      details: error,
    };
  }
  if (message.includes("email not confirmed")) {
    return {
      code: "AUTH_EMAIL_NOT_CONFIRMED",
      message:
        "Você precisa confirmar seu email antes de entrar. Veja sua caixa de entrada.",
      retryable: false,
      details: error,
    };
  }
  if (message.includes("password") && message.includes("6")) {
    return {
      code: "AUTH_WEAK_PASSWORD",
      message: "A senha precisa ter pelo menos 6 caracteres.",
      retryable: true,
      details: error,
    };
  }
  if (message.includes("rate limit") || error.status === 429) {
    return {
      code: "AUTH_RATE_LIMITED",
      message:
        "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
      retryable: true,
      details: error,
    };
  }

  return {
    code: "AUTH_UNKNOWN",
    message:
      error.message ||
      "Não foi possível concluir a autenticação. Tente novamente.",
    retryable: true,
    details: error,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isInitialized: false,
  isLoading: false,

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return err(mapAuthError(error));
      }
      // onAuthStateChange will populate user / session.
      return ok(null);
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return err(mapAuthError(error));
      }
      return ok(null);
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return err(mapAuthError(error));
      }
      return ok(null);
    } finally {
      set({ isLoading: false });
    }
  },

  initialize: () => {
    // Seed with whatever is in storage right now.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        set({
          session: data.session,
          user: data.session?.user ?? null,
          isInitialized: true,
        });
      })
      .catch(() => {
        set({ isInitialized: true });
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isInitialized: true,
      });
    });

    return () => {
      data.subscription.unsubscribe();
    };
  },
}));
