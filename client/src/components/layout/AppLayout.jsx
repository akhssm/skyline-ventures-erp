import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { bookingRequests, followUps, leads } from "../../api/resources";
import { useAuth } from "../../context/AuthContext";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { menuForRole } from "../../config/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const COLLAPSE_KEY = "sb.sidebarCollapsed";

const readCollapsePref = () => {
    try {
        return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
        return false;
    }
};

/**
 * The signed-in shell. Owns sidebar state and the counters the sidebar
 * renders as pills, so each page does not have to fetch them itself.
 */
const AppLayout = () => {
    const { user } = useAuth();
    const location = useLocation();
    const isDesktop = useIsDesktop();

    const [collapsePref, setCollapsePref] = useState(readCollapsePref);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [counts, setCounts] = useState({});

    // Collapsing is a desktop affordance. Narrow screens use the drawer, so
    // the remembered preference is ignored there rather than producing an
    // icon-only drawer nobody can read.
    const isCollapsed = collapsePref && isDesktop;

    const toggleCollapse = useCallback(() => {
        setCollapsePref((current) => {
            const next = !current;

            try {
                localStorage.setItem(COLLAPSE_KEY, String(next));
            } catch {
                // Forgetting the preference is harmless.
            }

            return next;
        });
    }, []);

    // The drawer closes itself whenever the route changes.
    useEffect(() => setIsDrawerOpen(false), [location.pathname]);

    // Escape closes the drawer, and it must not linger once the layout grows
    // back into a fixed rail.
    useEffect(() => {
        if (!isDrawerOpen) return;

        if (isDesktop) {
            setIsDrawerOpen(false);
            return;
        }

        const onKeyDown = (event) => {
            if (event.key === "Escape") setIsDrawerOpen(false);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isDrawerOpen, isDesktop]);

    // Only the counters this role's menu actually shows are requested.
    useEffect(() => {
        const visible = new Set(menuForRole(user.role).map((item) => item.badge).filter(Boolean));

        let cancelled = false;

        const apply = (key, value) =>
            !cancelled && setCounts((current) => ({ ...current, [key]: value }));

        if (visible.has("leads")) {
            leads
                .stats()
                .then((response) => apply("leads", response.data.total))
                .catch(() => {});
        }

        if (visible.has("followUps")) {
            followUps
                .list({ status: "pending", limit: 1 })
                .then((response) => apply("followUps", response.pagination.total))
                .catch(() => {});
        }

        if (visible.has("bookingRequests")) {
            bookingRequests
                .list({ status: "pending", limit: 1 })
                .then((response) => apply("bookingRequests", response.pagination.total))
                .catch(() => {});
        }

        return () => {
            cancelled = true;
        };
    }, [user.role, location.pathname]);

    return (
        <div className={`shell${isCollapsed ? " is-collapsed" : ""}`}>
            <Sidebar
                isCollapsed={isCollapsed}
                canCollapse={isDesktop}
                onToggleCollapse={toggleCollapse}
                isOpen={isDrawerOpen}
                onNavigate={() => setIsDrawerOpen(false)}
                counts={counts}
            />

            {isDrawerOpen && !isDesktop ? (
                <div
                    className="sidebar-scrim"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-hidden="true"
                />
            ) : null}

            <div className="main">
                <Topbar
                    organizationName={user.organization?.name || "Workspace"}
                    onOpenSidebar={() => setIsDrawerOpen(true)}
                />

                <main className="content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
