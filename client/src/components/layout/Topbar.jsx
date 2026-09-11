import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, Settings, UserRound } from "lucide-react";

import { notifications as notificationsApi } from "../../api/resources";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../config/navigation";
import { initials, relativeTime } from "../../utils/format";
import { Spinner } from "../ui";

/** Closes a popover when the pointer goes down anywhere outside it. */
const useOutsideClose = (ref, onClose, isOpen) => {
    useEffect(() => {
        if (!isOpen) return;

        const handler = (event) => {
            if (!ref.current?.contains(event.target)) onClose();
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, onClose, isOpen]);
};

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const ref = useRef(null);
    useOutsideClose(ref, () => setIsOpen(false), isOpen);

    // The badge refreshes on mount and every couple of minutes.
    useEffect(() => {
        let cancelled = false;

        const load = () =>
            notificationsApi
                .unreadCount()
                .then((response) => !cancelled && setUnread(response.data.count))
                .catch(() => {});

        load();
        const timer = setInterval(load, 120000);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    const open = async () => {
        setIsOpen(true);
        setIsLoading(true);

        try {
            const response = await notificationsApi.list({ limit: 12 });
            setItems(response.data);
        } catch {
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const markAllRead = async () => {
        await notificationsApi.markAllRead().catch(() => {});

        setUnread(0);
        setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
    };

    return (
        <div className="profile" ref={ref}>
            <button
                type="button"
                className="icon-button"
                onClick={() => (isOpen ? setIsOpen(false) : open())}
                aria-label={`Notifications, ${unread} unread`}
            >
                <Bell />
                {unread > 0 ? (
                    <span className="badge-dot">{unread > 9 ? "9+" : unread}</span>
                ) : null}
            </button>

            {isOpen ? (
                <div className="notif-panel">
                    <header className="notif-head">
                        <b>Notifications</b>
                        {unread > 0 ? (
                            <button type="button" onClick={markAllRead}>
                                Mark all read
                            </button>
                        ) : null}
                    </header>

                    <div className="notif-list">
                        {isLoading ? (
                            <div className="state" style={{ padding: 32 }}>
                                <Spinner />
                            </div>
                        ) : items.length ? (
                            items.map((item) => (
                                <div
                                    key={item._id}
                                    className={`notif-item${item.readAt ? "" : " is-unread"}`}
                                >
                                    <b>{item.title}</b>
                                    <p>{item.body}</p>
                                    <time>{relativeTime(item.createdAt)}</time>
                                </div>
                            ))
                        ) : (
                            <div className="state" style={{ padding: 32 }}>
                                <p>You are all caught up.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

const Topbar = ({ organizationName, onOpenSidebar }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useOutsideClose(menuRef, () => setIsMenuOpen(false), isMenuOpen);

    return (
        <header className="topbar">
            <button
                type="button"
                className="icon-button is-mobile-only"
                onClick={onOpenSidebar}
                aria-label="Open menu"
            >
                <Menu />
            </button>

            <span className="tenant-chip">{organizationName}</span>

            <div className="topbar-spacer" />

            <NotificationBell />

            <div className="profile" ref={menuRef}>
                <button
                    type="button"
                    className="profile-trigger"
                    onClick={() => setIsMenuOpen((open) => !open)}
                    aria-expanded={isMenuOpen}
                >
                    <span
                        className="avatar"
                        style={{ background: user.avatarColor || "var(--brand-600)" }}
                    >
                        {user.initials || initials(user.name)}
                    </span>

                    <span className="profile-id">
                        <b>{user.roleLabel || ROLE_LABELS[user.role]}</b>
                        <span>{user.name}</span>
                    </span>

                    <ChevronDown size={15} style={{ color: "var(--text-subtle)" }} />
                </button>

                {isMenuOpen ? (
                    <div className="profile-menu">
                        <div className="profile-menu-head">
                            <b>{user.name}</b>
                            <span>+91 {user.phone}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setIsMenuOpen(false);
                                navigate("/layout/profile");
                            }}
                        >
                            <UserRound /> My profile
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setIsMenuOpen(false);
                                navigate("/layout/configuration");
                            }}
                        >
                            <Settings /> Configuration
                        </button>

                        <button type="button" className="is-danger" onClick={signOut}>
                            <LogOut /> Sign out
                        </button>
                    </div>
                ) : null}
            </div>
        </header>
    );
};

export default Topbar;
