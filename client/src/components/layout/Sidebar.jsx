import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";

import { menuForRole } from "../../config/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const Sidebar = ({ isCollapsed, canCollapse, onToggleCollapse, isOpen, onNavigate, counts }) => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const location = useLocation();

    const menu = menuForRole(user.role);

    // A group opens itself whenever the current route is one of its children.
    const [openGroups, setOpenGroups] = useState(() =>
        menu
            .filter((item) => item.children?.some((child) => location.pathname.startsWith(child.path)))
            .map((item) => item.id)
    );

    useEffect(() => {
        menu.forEach((item) => {
            if (!item.children) return;

            const isInside = item.children.some((child) => location.pathname.startsWith(child.path));

            if (isInside) {
                setOpenGroups((current) =>
                    current.includes(item.id) ? current : [...current, item.id]
                );
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const toggleGroup = (id) =>
        setOpenGroups((current) =>
            current.includes(id) ? current.filter((g) => g !== id) : [...current, id]
        );

    return (
        <aside className={`sidebar${isOpen ? " is-open" : ""}`}>
            {/* Sits on the seam between rail and content, so it is in the same
                place whether the rail is open or closed. */}
            {canCollapse ? (
                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={onToggleCollapse}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!isCollapsed}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                </button>
            ) : null}

            <div className="sidebar-head">
                <span className="sidebar-logo">S&amp;B</span>

                <div className="sidebar-wordmark">
                    <b>Sell&amp;Bill</b>
                    <span>ESTATE OPS</span>
                </div>
            </div>

            <div className="sidebar-section">WORKSPACE</div>

            <nav className="sidebar-nav">
                {menu.map((item) => {
                    const Icon = item.icon;

                    if (item.children) {
                        const isOpenGroup = openGroups.includes(item.id);
                        const isInside = item.children.some((child) =>
                            location.pathname.startsWith(child.path)
                        );

                        return (
                            <div key={item.id}>
                                <button
                                    type="button"
                                    className={`nav-item${isInside ? " is-active" : ""}`}
                                    onClick={() => toggleGroup(item.id)}
                                    aria-expanded={isOpenGroup}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <Icon />
                                    <span className="nav-label">{item.label}</span>
                                    <ChevronDown
                                        className={`nav-chevron${isOpenGroup ? " is-open" : ""}`}
                                    />
                                </button>

                                {isOpenGroup && !isCollapsed ? (
                                    <div className="nav-submenu">
                                        {item.children.map((child) => (
                                            <NavLink
                                                key={child.path}
                                                to={child.path}
                                                className={({ isActive }) =>
                                                    `nav-subitem${isActive ? " is-active" : ""}`
                                                }
                                                onClick={onNavigate}
                                            >
                                                {child.label}
                                            </NavLink>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        );
                    }

                    // Some modules own detail screens on other paths, so they
                    // declare the prefixes that should still light them up.
                    const isActive = item.match
                        ? item.match.some((prefix) => location.pathname.startsWith(prefix))
                        : location.pathname === item.path;

                    const count = item.badge ? counts[item.badge] : null;

                    return (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            className={`nav-item${isActive ? " is-active" : ""}`}
                            onClick={onNavigate}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon />
                            <span className="nav-label">{item.label}</span>

                            {count ? (
                                <span className="nav-count">
                                    {count > 9999 ? "9999+" : count.toLocaleString("en-IN")}
                                </span>
                            ) : null}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-foot">
                {/* A 68px rail has no room for two labelled halves, so the pair
                    becomes a single icon toggle. */}
                {isCollapsed ? (
                    <button
                        type="button"
                        className="nav-item"
                        style={{ justifyContent: "center" }}
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        title={theme === "light" ? "Switch to dark" : "Switch to light"}
                        aria-label={theme === "light" ? "Switch to dark" : "Switch to light"}
                    >
                        {theme === "light" ? <Moon /> : <Sun />}
                    </button>
                ) : (
                    <div className="theme-switch" role="group" aria-label="Colour theme">
                        <button
                            type="button"
                            className={theme === "light" ? "is-active" : ""}
                            onClick={() => setTheme("light")}
                            aria-pressed={theme === "light"}
                        >
                            LIGHT
                        </button>

                        <button
                            type="button"
                            className={theme === "dark" ? "is-active" : ""}
                            onClick={() => setTheme("dark")}
                            aria-pressed={theme === "dark"}
                        >
                            DARK
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
