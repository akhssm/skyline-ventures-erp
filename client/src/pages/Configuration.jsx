import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { configGroupsForRole } from "../config/configurationGroups";
import ConfigBack from "../components/config/ConfigBack";

/* The configuration landing page. It holds no settings of its own: every
   list lives on its own screen, and this page is the index of them, grouped
   by the part of the product each list feeds. A role only sees the screens
   it may open, so a group with nothing in it is dropped entirely. */
const Configuration = () => {
    const { user } = useAuth();

    const groups = useMemo(() => configGroupsForRole(user.role), [user.role]);

    return (
        <div className="cfg-shell">
            <header className="cfg-head">
                <div className="cfg-head__lead">
                    <ConfigBack fallback="/layout/dashboard" />

                    <h1 className="cfg-title">Configuration</h1>

                    <p className="cfg-sub">
                        The lists every other screen chooses from. Changing one here changes what
                        the forms offer everywhere.
                    </p>
                </div>
            </header>

            {groups.map((group) => (
                <section key={group.title} className="cfg-group">
                    <div className="cfg-group__head">
                        <h2>{group.title}</h2>
                        <p>{group.blurb}</p>
                    </div>

                    <div className="cfg-cards">
                        {group.entries.map((entry) => {
                            const Icon = entry.icon;

                            return (
                                <Link
                                    key={entry.path}
                                    to={`/layout/${entry.path}`}
                                    className="cfg-card"
                                >
                                    <span className="cfg-card__icon">
                                        <Icon />
                                    </span>

                                    <span className="cfg-card__text">
                                        <strong>{entry.label}</strong>
                                        <small>{entry.blurb}</small>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            ))}

            {groups.length ? null : (
                <div className="cfg-empty">
                    <AlertCircle />
                    <h3>Nothing to configure</h3>
                    <p>Your role does not manage any of these settings.</p>
                </div>
            )}
        </div>
    );
};

export default Configuration;
