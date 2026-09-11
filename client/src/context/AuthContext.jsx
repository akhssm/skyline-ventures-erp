import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { onUnauthorized, TOKEN_KEY } from "../api/client";
import { auth } from "../api/resources";

const AuthContext = createContext(null);

const USER_KEY = "sb.user";

const readStoredUser = () => {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readStoredUser);
    // Starts true so the app does not flash the login screen while the stored
    // token is being revalidated.
    const [isRestoring, setIsRestoring] = useState(() =>
        Boolean(localStorage.getItem(TOKEN_KEY))
    );

    const signOut = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
    }, []);

    const signIn = useCallback(async (phone, otp) => {
        const response = await auth.verifyOtp(phone, otp);

        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        setUser(response.user);

        return response.user;
    }, []);

    // A stored token may have expired while the tab was closed, so it is
    // checked against the server before the shell renders.
    useEffect(() => {
        if (!localStorage.getItem(TOKEN_KEY)) return;

        let cancelled = false;

        auth.me()
            .then((response) => {
                if (cancelled) return;

                localStorage.setItem(USER_KEY, JSON.stringify(response.user));
                setUser(response.user);
            })
            .catch(() => {
                if (!cancelled) signOut();
            })
            .finally(() => {
                if (!cancelled) setIsRestoring(false);
            });

        return () => {
            cancelled = true;
        };
    }, [signOut]);

    // Any 401 from a normal API call ends the session immediately.
    useEffect(() => onUnauthorized(signOut), [signOut]);

    const value = useMemo(
        () => ({ user, isRestoring, signIn, signOut, isAuthenticated: Boolean(user) }),
        [user, isRestoring, signIn, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) throw new Error("useAuth must be used inside AuthProvider");

    return context;
};
