import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { onUnauthorized, TOKEN_KEY } from "../api/client";
import { auth } from "../api/resources";

const AuthContext = createContext(null);

const USER_KEY = "sb.user";

/**
 * Reads the stored session.
 *
 * The token is what the API actually accepts, so a stored profile without one
 * is not a session. Treating it as one is how a signed out tab used to let a
 * person back in: any leftover profile record was enough to look signed in.
 * Anything half written is cleared rather than trusted.
 */
const readStoredSession = () => {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const raw = localStorage.getItem(USER_KEY);

        if (token && raw) return JSON.parse(raw);
    } catch {
        // A corrupt profile is treated as no session at all.
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    return null;
};

const hasStoredToken = () => Boolean(localStorage.getItem(TOKEN_KEY));

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readStoredSession);
    // Starts true so the app does not flash the login screen while the stored
    // token is being revalidated.
    const [isRestoring, setIsRestoring] = useState(hasStoredToken);

    /* Every sign out bumps this. A reply that was already in flight compares
       the epoch it started under and drops itself, instead of writing the
       profile back and reviving a session the person just ended. */
    const epoch = useRef(0);

    const signOut = useCallback(() => {
        epoch.current += 1;

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        setUser(null);
        setIsRestoring(false);
    }, []);

    const signIn = useCallback(async (phone, otp) => {
        const response = await auth.verifyOtp(phone, otp);

        epoch.current += 1;

        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));

        setUser(response.user);
        setIsRestoring(false);

        return response.user;
    }, []);

    // A stored token may have expired while the tab was closed, so it is
    // checked against the server before the shell renders.
    useEffect(() => {
        // isRestoring was initialised from the same check, so with no token it
        // is already false and there is nothing to revalidate.
        if (!hasStoredToken()) return;

        const startedAt = epoch.current;
        // True once this reply no longer describes the current session, either
        // because the provider unmounted or because the person signed out
        // while the request was still open.
        const isStale = () => epoch.current !== startedAt;

        auth.me()
            .then((response) => {
                if (isStale() || !hasStoredToken()) return;

                localStorage.setItem(USER_KEY, JSON.stringify(response.user));
                setUser(response.user);
            })
            .catch(() => {
                if (!isStale()) signOut();
            })
            .finally(() => {
                if (!isStale()) setIsRestoring(false);
            });

        return () => {
            epoch.current += 1;
        };
    }, [signOut]);

    /**
     * Storage is the source of truth, and it can change without this tab
     * doing anything: another tab signs out, or the browser restores this
     * page from the back/forward cache with in-memory state older than
     * storage. Both are how a signed out person used to end up back inside
     * the app by pressing the forward button.
     */
    useEffect(() => {
        const resync = () => {
            if (hasStoredToken()) return;

            epoch.current += 1;
            setUser(null);
            setIsRestoring(false);
        };

        const onStorage = (event) => {
            // A null key means the whole store was cleared.
            if (event.key === null || event.key === TOKEN_KEY || event.key === USER_KEY) resync();
        };

        const onPageShow = (event) => {
            if (event.persisted) resync();
        };

        window.addEventListener("storage", onStorage);
        window.addEventListener("pageshow", onPageShow);

        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("pageshow", onPageShow);
        };
    }, []);

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
