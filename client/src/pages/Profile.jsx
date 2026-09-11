import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { DetailList } from "../components/ui";
import { ROLE_LABELS, menuForRole } from "../config/navigation";
import { dateTime, initials, phone as formatPhone } from "../utils/format";

const Profile = () => {
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();

    const modules = menuForRole(user.role);

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">My profile</h1>
                    <div className="page-summary">
                        <span>Your account and what you can reach in this workspace</span>
                    </div>
                </div>

                <div className="page-actions">
                    <button type="button" className="btn btn-secondary" onClick={signOut}>
                        <LogOut /> Sign out
                    </button>
                </div>
            </div>

            <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 24,
                    }}
                >
                    <span
                        className="avatar"
                        style={{
                            width: 56,
                            height: 56,
                            fontSize: 18,
                            background: user.avatarColor || "var(--brand-600)",
                        }}
                    >
                        {user.initials || initials(user.name)}
                    </span>

                    <div>
                        <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text-strong)" }}>
                            {user.name}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            {user.roleLabel || ROLE_LABELS[user.role]}
                        </div>
                    </div>
                </div>

                <DetailList
                    items={[
                        { label: "Mobile", value: `+91 ${formatPhone(user.phone)}`, mono: true },
                        { label: "Email", value: user.email || "Not set" },
                        { label: "Organization", value: user.organization?.name },
                        { label: "Role", value: user.roleLabel || ROLE_LABELS[user.role] },
                        {
                            label: "Last signed in",
                            value: user.lastLoginAt ? dateTime(user.lastLoginAt) : "This session",
                            mono: true,
                        },
                    ]}
                />
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                    <h3>Appearance</h3>
                </div>

                <div className="card-pad">
                    <div className="segmented" style={{ width: "fit-content" }}>
                        <button
                            type="button"
                            className={theme === "light" ? "is-active" : ""}
                            onClick={() => setTheme("light")}
                        >
                            Light
                        </button>
                        <button
                            type="button"
                            className={theme === "dark" ? "is-active" : ""}
                            onClick={() => setTheme("dark")}
                        >
                            Dark
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-head">
                    <h3>Modules you can open</h3>
                    <span className="mono" style={{ color: "var(--text-muted)" }}>
                        {modules.length}
                    </span>
                </div>

                <div className="card-pad">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {modules.map((module) =>
                            module.children ? (
                                module.children.map((child) => (
                                    <Link key={child.path} to={child.path} className="tag">
                                        {child.label}
                                    </Link>
                                ))
                            ) : (
                                <Link key={module.id} to={module.path} className="tag">
                                    {module.label}
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
