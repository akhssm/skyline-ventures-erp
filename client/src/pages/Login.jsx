import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
    AlertCircle,
    FileCheck,
    Info,
    Lock,
    MapPin,
    ShieldCheck,
    ShieldX,
} from "lucide-react";

import { auth } from "../api/resources";
import { useAuth } from "../context/AuthContext";
import { landingPathForRole } from "../config/navigation";

/* ---------------------------------------------------------
   TOWER GRID
   A decorative inventory board. The mix is generated once so
   it does not reshuffle on every keystroke.
   --------------------------------------------------------- */

const STATES = ["available", "hold", "reserved", "booked", "sold"];

// Most flats in a live tower are already gone, so the board reads mostly
// settled with sales scattered through it.
const WEIGHTS = { available: 6, hold: 7, reserved: 7, booked: 8, sold: 72 };

const pickState = () => {
    const roll = Math.random() * 100;
    let cursor = 0;

    for (const state of STATES) {
        cursor += WEIGHTS[state];
        if (roll < cursor) return state;
    }

    return "sold";
};

// Three towers of different heights standing on one ground line. The counts
// are what give each building its silhouette.
const TOWERS = [
    { name: "Tower A", columns: 7, rows: 15 },
    { name: "Tower B", columns: 8, rows: 22 },
    { name: "Tower C", columns: 6, rows: 12 },
];

const Towers = () => {
    // Generated once, so the board does not reshuffle on every keystroke.
    const towers = useMemo(
        () =>
            TOWERS.map((tower) => ({
                ...tower,
                cells: Array.from({ length: tower.columns * tower.rows }, pickState),
            })),
        []
    );

    return (
        <div className="towers" aria-hidden="true">
            {towers.map((tower) => (
                <div key={tower.name} className="tower">
                    <span className="tower-label">{tower.name.toUpperCase()}</span>

                    <div className="tower-grid" style={{ "--cols": tower.columns }}>
                        {tower.cells.map((state, index) => (
                            <i key={index} className={`tower-cell is-${state}`} />
                        ))}
                    </div>
                </div>
            ))}

            <ul className="tower-legend">
                {STATES.map((state) => (
                    <li key={state}>
                        <i className={`tower-cell is-${state}`} />
                        {state.toUpperCase()}
                    </li>
                ))}
            </ul>
        </div>
    );
};

/* ---------------------------------------------------------
   LOGIN
   --------------------------------------------------------- */

const RESEND_SECONDS = 30;

const Login = () => {
    const { isAuthenticated, user, signIn } = useAuth();

    const [step, setStep] = useState("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState("");
    const [demoOtp, setDemoOtp] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(0);

    const otpRef = useRef(null);

    const isPhoneValid = /^[6-9]\d{9}$/.test(phone);

    useEffect(() => {
        if (step === "otp") otpRef.current?.focus();
    }, [step]);

    // Counts down the resend cooldown.
    useEffect(() => {
        if (secondsLeft <= 0) return;

        const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft]);

    if (isAuthenticated) return <Navigate to={landingPathForRole(user.role)} replace />;

    const requestOtp = async (event) => {
        event?.preventDefault();

        if (!isPhoneValid) {
            setError("Enter a valid 10-digit mobile number");
            return;
        }

        setIsBusy(true);
        setError("");

        try {
            const response = await auth.sendOtp(phone);

            setDemoOtp(response.demoOtp || "");
            setSecondsLeft(RESEND_SECONDS);
            setOtp("");
            setStep("otp");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsBusy(false);
        }
    };

    const submitOtp = async (event) => {
        event.preventDefault();

        if (otp.length !== 6) {
            setError("Enter the 6-digit OTP");
            return;
        }

        setIsBusy(true);
        setError("");

        try {
            await signIn(phone, otp);
            // The redirect above takes over once the user lands in context.
        } catch (err) {
            setError(err.message);
            setOtp("");
            otpRef.current?.focus();
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="login">
            <section className="login-hero">
                <div className="brand">
                    <span className="brand-mark">S&amp;B</span>

                    <div>
                        <div className="brand-name">Sell&amp;Bill</div>
                        <div className="brand-tag">ESTATE OPERATIONS</div>
                    </div>
                </div>

                <div className="hero-top">
                    <div className="hero-copy">
                        <h1 className="hero-title">
                            Turn Leads Into <em>Deals.</em>
                        </h1>

                        <p className="hero-sub">
                            Capture leads, automate follow-ups, close deals faster. Built for Indian
                            real estate agencies.
                        </p>
                    </div>

                    <div>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>10x</strong>
                                <span>Faster response</span>
                            </div>

                            <div className="hero-metric">
                                <strong>85%</strong>
                                <span>Less manual work</span>
                            </div>

                            <div className="hero-metric">
                                <strong>3x</strong>
                                <span>More conversions</span>
                            </div>
                        </div>

                        <p className="hero-trusted">
                            Trusted by 100+ real estate agencies across India
                        </p>
                    </div>
                </div>

                <Towers />

                <ul className="hero-compliance">
                    <li>
                        <ShieldCheck /> SOC 2 Certified
                    </li>
                    <li>
                        <Lock /> GDPR Compliant
                    </li>
                    <li>
                        <ShieldX /> No Data Selling
                    </li>
                </ul>
            </section>

            <section className="login-pane">
                <div className="login-form">
                    <span className="login-eyebrow">SIGN IN</span>
                    <h2 className="login-heading">Welcome back</h2>

                    <p className="login-intro">
                        {step === "phone"
                            ? "Enter your registered mobile number and we'll send a one-time password."
                            : `Enter the 6-digit code we sent to +91 ${phone}.`}
                    </p>

                    {step === "phone" ? (
                        <form onSubmit={requestOtp} noValidate>
                            <div className="field">
                                <label className="field-label" htmlFor="phone">
                                    Mobile number
                                </label>

                                <div className="phone-input">
                                    <span className="prefix">+91</span>

                                    <input
                                        id="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel-national"
                                        placeholder="98765 43210"
                                        maxLength={10}
                                        value={phone}
                                        onChange={(event) => {
                                            setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                                            setError("");
                                        }}
                                    />
                                </div>
                            </div>

                            {error ? (
                                <div className="login-error" role="alert">
                                    <AlertCircle size={15} /> {error}
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                className="login-submit"
                                disabled={!isPhoneValid || isBusy}
                            >
                                {isBusy ? "Sending OTP…" : "Send OTP"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={submitOtp} noValidate>
                            <div className="field">
                                <label className="field-label" htmlFor="otp">
                                    Enter 6-digit OTP
                                </label>

                                <input
                                    id="otp"
                                    ref={otpRef}
                                    type="text"
                                    className="otp-input"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    placeholder="••••••"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(event) => {
                                        setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                                        setError("");
                                    }}
                                />
                            </div>

                            {demoOtp ? (
                                <div className="login-hint">
                                    <Info size={15} />
                                    <span>
                                        Demo mode. Your OTP is <code>{demoOtp}</code>
                                    </span>
                                </div>
                            ) : null}

                            {error ? (
                                <div className="login-error" role="alert">
                                    <AlertCircle size={15} /> {error}
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                className="login-submit"
                                disabled={otp.length !== 6 || isBusy}
                            >
                                {isBusy ? "Verifying…" : "Verify and sign in"}
                            </button>

                            <button
                                type="button"
                                className="login-back"
                                onClick={() => {
                                    setStep("phone");
                                    setOtp("");
                                    setError("");
                                }}
                            >
                                &larr; Change mobile number
                            </button>

                            <p className="login-resend">
                                {secondsLeft > 0 ? (
                                    `Resend available in ${secondsLeft}s`
                                ) : (
                                    <button type="button" onClick={requestOtp} disabled={isBusy}>
                                        Resend OTP
                                    </button>
                                )}
                            </p>
                        </form>
                    )}
                </div>

                <footer className="login-footer">
                    <p className="login-secure">
                        <Lock /> Your data is encrypted and never shared with third parties
                    </p>

                    <ul className="login-badges">
                        <li>
                            <ShieldCheck /> SSL Secured
                        </li>
                        <li>
                            <MapPin /> India Data Center
                        </li>
                        <li>
                            <FileCheck /> GDPR Ready
                        </li>
                    </ul>
                </footer>
            </section>
        </div>
    );
};

export default Login;
