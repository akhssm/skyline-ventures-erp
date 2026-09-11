import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query from JavaScript.
 *
 * Layout that only CSS can see is fine in CSS, but some behaviour has to
 * change too: the sidebar is a collapsible rail on a desktop and a drawer on
 * a phone, and those are different interactions, not just different widths.
 */
export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() =>
        typeof window === "undefined" ? false : window.matchMedia(query).matches
    );

    useEffect(() => {
        const list = window.matchMedia(query);

        // Read once on mount in case the width changed before this ran.
        setMatches(list.matches);

        const onChange = (event) => setMatches(event.matches);

        list.addEventListener("change", onChange);
        return () => list.removeEventListener("change", onChange);
    }, [query]);

    return matches;
};

/** True on viewports wide enough for the sidebar to sit beside the content. */
export const useIsDesktop = () => useMediaQuery("(min-width: 1025px)");
