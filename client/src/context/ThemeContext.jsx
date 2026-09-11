import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "sb.theme";

const readStoredTheme = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") return stored;
    } catch {
        // Private browsing can block storage; the OS preference still applies.
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(readStoredTheme);

    // The attribute on <html> is what every token block keys off.
    useEffect(() => {
        document.documentElement.dataset.theme = theme;

        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // Not being able to remember the choice is not worth an error.
        }
    }, [theme]);

    const toggleTheme = useCallback(
        () => setTheme((current) => (current === "light" ? "dark" : "light")),
        []
    );

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (!context) throw new Error("useTheme must be used inside ThemeProvider");

    return context;
};
