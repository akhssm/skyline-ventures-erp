/**
 * Brand marks for the nine providers the workspace can connect to.
 *
 * Drawn inline rather than fetched, so a tile never waits on a third party
 * and never leaks a page view to one. Each provider carries its own colour,
 * the tile tints its background from the same value.
 */

/* ---------------------------------------------------------
   GLYPHS
   Each is drawn on a 24x24 box and inherits its colour from
   the tile, except where the real logo is multi-coloured.
   --------------------------------------------------------- */

const WhatsAppGlyph = () => (
    <>
        <path
            fill="currentColor"
            d="M12 2a10 10 0 0 0-8.5 15.2L2.2 22l4.9-1.3A10 10 0 1 0 12 2Z"
        />
        <path
            fill="#fff"
            d="M9 7.4c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.6l-.4.5c-.1.2-.2.3-.1.5.5.9 1.4 1.8 2.3 2.3.2.1.4 0 .5-.1l.5-.5c.2-.2.4-.2.6-.1l1.9.8c.5.2.5.4.5.6v.5c0 .2 0 .5-.4.7-.4.3-1 .4-1.6.4-1.8-.2-3.6-1.2-4.9-2.5-1.3-1.3-2.3-3.1-2.5-4.9-.1-.6.1-1.2.4-1.6Z"
        />
    </>
);

const FacebookGlyph = () => (
    <>
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
            fill="#fff"
            d="M13.3 21.9v-7.4h2.5l.4-2.9h-2.9V9.8c0-.8.2-1.4 1.4-1.4h1.6V5.8c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H7.9v2.9h2.5v7.4c.5.1 1.1.1 1.6.1s1.1 0 1.3-.1Z"
        />
    </>
);

/* Google Ads: the two bars splaying from a shared apex, with the dot at the
   foot of the yellow one. Both bars pivot about that apex, not their centres,
   so they open downwards instead of crossing. */
const GoogleAdsGlyph = () => (
    <>
        <rect
            x="9.4"
            y="2"
            width="5.2"
            height="15"
            rx="2.6"
            fill="#FBBC04"
            transform="rotate(-28 12 4.6)"
        />
        <rect
            x="9.4"
            y="2"
            width="5.2"
            height="15"
            rx="2.6"
            fill="#4285F4"
            transform="rotate(28 12 4.6)"
        />
        <circle cx="6.2" cy="15.6" r="3.3" fill="#4285F4" />
    </>
);

/* Exotel: a handset with two call waves. */
const ExotelGlyph = () => (
    <>
        <path
            fill="currentColor"
            d="M8.3 4.5c.4-.4 1-.4 1.4.1l1.8 2.5c.3.5.2 1.1-.2 1.5l-1 .8c-.2.2-.3.5-.2.8.6 1.4 1.8 2.6 3.2 3.2.3.1.6 0 .8-.2l.8-1c.4-.4 1-.5 1.5-.2l2.5 1.8c.5.4.5 1 .1 1.4l-1.3 1.3c-.7.7-1.7.9-2.6.6-2.1-.7-4-1.9-5.6-3.5-1.6-1.6-2.8-3.5-3.5-5.6-.3-.9-.1-1.9.6-2.6l1.7-.9Z"
        />
        <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.45"
            d="M15.5 3.4a6.5 6.5 0 0 1 5.1 5.1M15 7a3 3 0 0 1 2 2"
        />
    </>
);

/* MagicBricks: a roof over a brick course. */
const MagicBricksGlyph = () => (
    <>
        <path fill="currentColor" d="M12 2.6 22 10h-3.1L12 5.1 5.1 10H2l10-7.4Z" />
        <path
            fill="currentColor"
            opacity="0.55"
            d="M4.4 11.4h15.2v3.1H4.4v-3.1Zm-1.6 4.6h6.5v3.1H2.8V16Zm8.1 0h10.3v3.1H10.9V16Z"
        />
    </>
);

/* 99acres: the two nines the portal is named for. */
const NinesGlyph = () => (
    <text
        x="12"
        y="16.6"
        textAnchor="middle"
        fill="currentColor"
        fontSize="11.5"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        letterSpacing="-0.5"
    >
        99
    </text>
);

/* Housing.com: an outlined house with a lit window. */
const HousingGlyph = () => (
    <>
        <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
            d="M3.6 10.4 12 3.6l8.4 6.8v9.1a.9.9 0 0 1-.9.9h-15a.9.9 0 0 1-.9-.9v-9.1Z"
        />
        <rect x="9.6" y="12.6" width="4.8" height="7.8" rx="0.8" fill="currentColor" />
    </>
);

/* Razorpay: the slab-cut R the payment mark is built from. */
const RazorpayGlyph = () => (
    <>
        <path fill="currentColor" opacity="0.45" d="M15.6 2.2 14.4 7 5.9 12l1.9-6.9 7.8-2.9Z" />
        <path fill="currentColor" d="M13.3 8.1 9.6 21.8H5.9l2-7.4 5.4-6.3Zm5.5-5.9-4.9 19.6h-3.7L14.9 5l3.9-2.8Z" />
    </>
);

/* Tally: the ledger the accounts are pushed into. */
const TallyGlyph = () => (
    <>
        <rect
            x="3.4"
            y="3.4"
            width="17.2"
            height="17.2"
            rx="3.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        />
        <path
            fill="currentColor"
            d="M7.6 7.4h8.8v2.2h-3.3v7.1h-2.2V9.6H7.6V7.4Z"
        />
    </>
);

/* ---------------------------------------------------------
   REGISTRY
   Colour, glyph and the one-line description each card shows
   under the provider name.
   --------------------------------------------------------- */

export const PROVIDERS = {
    whatsapp_cloud: {
        label: "WhatsApp Cloud API",
        color: "#25D366",
        group: "messaging",
        blurb: "Templates, delivery receipts and replies",
        Glyph: WhatsAppGlyph,
    },
    twilio: {
        label: "Twilio",
        color: "#F22F46",
        group: "messaging",
        blurb: "Programmable voice and SMS",
        Glyph: ExotelGlyph,
    },
    exotel: {
        label: "Exotel Cloud Telephony",
        color: "#6D3BEB",
        group: "messaging",
        blurb: "Click-to-call, recordings and call logs",
        Glyph: ExotelGlyph,
    },
    facebook_leads: {
        label: "Facebook Lead Ads",
        color: "#1877F2",
        group: "sources",
        blurb: "Instant forms straight into Leads",
        Glyph: FacebookGlyph,
    },
    google_ads: {
        label: "Google Ads",
        color: "#4285F4",
        group: "sources",
        blurb: "Campaign spend and conversion sync",
        Glyph: GoogleAdsGlyph,
        multicolour: true,
    },
    magicbricks: {
        label: "MagicBricks",
        color: "#D6222A",
        group: "sources",
        blurb: "Listing enquiries pulled every hour",
        Glyph: MagicBricksGlyph,
    },
    "99acres": {
        label: "99acres",
        color: "#C2185B",
        group: "sources",
        blurb: "Listing enquiries pulled every hour",
        Glyph: NinesGlyph,
    },
    housing: {
        label: "Housing.com",
        color: "#0B7EC8",
        group: "sources",
        blurb: "Listing enquiries pulled every hour",
        Glyph: HousingGlyph,
    },
    razorpay: {
        label: "Razorpay Payments",
        color: "#3395FF",
        group: "finance",
        blurb: "Collections, links and settlement status",
        Glyph: RazorpayGlyph,
    },
    tally: {
        label: "Tally Prime",
        color: "#1B75BB",
        group: "finance",
        blurb: "Receipts and expenses pushed to the ledger",
        Glyph: TallyGlyph,
    },
};

export const PROVIDER_GROUPS = [
    { id: "messaging", label: "Messaging & calling" },
    { id: "sources", label: "Lead sources" },
    { id: "finance", label: "Payments & accounting" },
];

/* A provider the registry has not met yet still gets a tile. */
const FALLBACK = {
    color: "#64748B",
    blurb: "Connected service",
    Glyph: () => (
        <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            d="M9.5 14.5 14.5 9.5M10.6 6.9l1.6-1.6a4.3 4.3 0 0 1 6.1 6.1l-1.6 1.6M13.4 17.1l-1.6 1.6a4.3 4.3 0 0 1-6.1-6.1l1.6-1.6"
        />
    ),
};

export const providerMeta = (provider) => PROVIDERS[provider] || FALLBACK;

/* ---------------------------------------------------------
   MARK
   --------------------------------------------------------- */

const ProviderMark = ({ provider, size = 40 }) => {
    const meta = providerMeta(provider);
    const { Glyph } = meta;

    return (
        <span
            className="provider-mark"
            style={{
                width: size,
                height: size,
                // The tint is the brand colour at low alpha, so every tile
                // reads as the brand without shouting over the card.
                background: `${meta.color}1a`,
                color: meta.color,
            }}
            aria-hidden="true"
        >
            <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58}>
                <Glyph />
            </svg>
        </span>
    );
};

export default ProviderMark;
