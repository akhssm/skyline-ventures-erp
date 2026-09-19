import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Lock } from "lucide-react";

import { useAuth } from "./context/AuthContext";
import { ROLES, canAccess, landingPathForRole } from "./config/navigation";
import { canOpenConfigPage } from "./config/configurationGroups";
import AppLayout from "./components/layout/AppLayout";
import ResourcePage from "./components/ResourcePage";
import { EmptyState, LoadingState } from "./components/ui";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import RepDashboard from "./pages/RepDashboard";
import CollectionsDashboard from "./pages/CollectionsDashboard";
import Leads from "./pages/Leads";
import Bookings from "./pages/Bookings";
import BookingsDrilldown from "./pages/BookingsDrilldown";
import Inventory from "./pages/Inventory";
import Duplicates from "./pages/Duplicates";
import ImportLeads from "./pages/ImportLeads";
import Expenses from "./pages/Expenses";
import PaymentPlans from "./pages/PaymentPlans";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import CallingSettings from "./pages/CallingSettings";
import Configuration from "./pages/Configuration";
import AssignmentRules from "./pages/config/AssignmentRules";
import BhkConfig from "./pages/config/BhkConfig";
import DocumentSettings from "./pages/config/DocumentSettings";
import ExpenditureConfig from "./pages/config/ExpenditureConfig";
import FacingConfig from "./pages/config/FacingConfig";
import LeadsConfig from "./pages/config/LeadsConfig";
import PaymentHeadConfig from "./pages/config/PaymentHeadConfig";
import PaymentModeConfig from "./pages/config/PaymentModeConfig";
import ProjectStageConfig from "./pages/config/ProjectStageConfig";
import TaxConfig from "./pages/config/TaxConfig";
import VendorConfig from "./pages/config/VendorConfig";
import ViewConfig from "./pages/config/ViewConfig";
import Integrations from "./pages/Integrations";
import ContactUs from "./pages/ContactUs";
import Profile from "./pages/Profile";

// Reports pull in the whole chart library, so they load on demand.
const Reports = lazy(() => import("./pages/Reports"));

import {
    bookingRequestsConfig,
    callLogConfig,
    channelPartnersConfig,
    commissionsConfig,
    documentsConfig,
    followUpsConfig,
    notificationsConfig,
    payoutRunsConfig,
    projectsConfig,
    quotationsConfig,
    siteVisitsConfig,
    usersConfig,
} from "./config/modules";

/* ---------------------------------------------------------
   ROUTE GUARDS
   --------------------------------------------------------- */

const FullScreenLoader = () => (
    <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <LoadingState label="Loading your workspace" />
    </div>
);

const RequireAuth = ({ children }) => {
    const { isAuthenticated, isRestoring } = useAuth();

    // Waiting here keeps a valid session from flashing the login screen.
    if (isRestoring) return <FullScreenLoader />;

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/** Blocks a module that is not in this role's menu. */
const RequireModule = ({ moduleId, children }) => {
    const { user } = useAuth();

    if (canAccess(user.role, moduleId)) return children;

    return (
        <EmptyState
            icon={Lock}
            title="You do not have access to this screen"
            description="Ask an administrator if you think you should be able to open it."
        />
    );
};

/**
 * One screen under Configuration. The card that opens it is only drawn for
 * the roles that own it, so the route enforces the same list rather than the
 * broader menu entry that lets a role reach the index at all.
 */
const RequireConfigPage = ({ path, children }) => {
    const { user } = useAuth();

    if (canOpenConfigPage(user.role, path)) return children;

    return (
        <EmptyState
            icon={Lock}
            title="You do not have access to this screen"
            description="Ask an administrator if you think you should be able to open it."
        />
    );
};

/** A config-driven module screen, guarded by the role menu. */
const ModuleRoute = ({ moduleId, config }) => (
    <RequireModule moduleId={moduleId}>
        {/* The key remounts the page when the route swaps one config for
            another, so no state leaks between modules. */}
        <ResourcePage key={config.id} config={config} />
    </RequireModule>
);

/** Sends a signed-in user to the first screen their role should see. */
const LandingRedirect = () => {
    const { user } = useAuth();
    return <Navigate to={landingPathForRole(user.role)} replace />;
};

/**
 * One dashboard route, a different dashboard per role, as the reference
 * application does. The CRM Manager gets the team and pipeline view; roles
 * without their own view yet keep the executive overview.
 */
const DASHBOARD_BY_ROLE = {
    [ROLES.MARKETING_MANAGER]: ManagerDashboard,
    [ROLES.MARKETING]: RepDashboard,
    [ROLES.RECEPTIONIST]: RepDashboard,
    [ROLES.ACCOUNTANT]: CollectionsDashboard,
};

const DashboardRoute = () => {
    const { user } = useAuth();

    const ForRole = DASHBOARD_BY_ROLE[user.role];

    return ForRole ? <ForRole /> : <Dashboard />;
};

/** A lazily loaded report screen behind the role guard. */
const ReportRoute = ({ view }) => (
    <RequireModule moduleId="reports">
        <Suspense fallback={<LoadingState label="Loading report" />}>
            <Reports view={view} />
        </Suspense>
    </RequireModule>
);

/* ---------------------------------------------------------
   APP
   Paths mirror the reference application, so a link from there
   opens the same screen here.
   --------------------------------------------------------- */

const App = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route
                path="/layout"
                element={
                    <RequireAuth>
                        <AppLayout />
                    </RequireAuth>
                }
            >
                <Route index element={<LandingRedirect />} />

                <Route path="dashboard" element={<DashboardRoute />} />

                {/* The leads screen is addressed as "customers". */}
                <Route path="customers" element={<Leads />} />
                <Route path="leads" element={<Navigate to="/layout/customers" replace />} />

                <Route
                    path="inventory"
                    element={
                        <RequireModule moduleId="inventory">
                            <Inventory />
                        </RequireModule>
                    }
                />

                {/* Post-sales work the booking queue. The owner drills down
                    through projects and towers into unit-level sales. */}
                <Route path="bookings" element={<Navigate to="/layout/bookings/pending-bookings" replace />} />
                <Route path="bookings/projects" element={<BookingsDrilldown />} />
                <Route path="bookings/towers/:projectId" element={<BookingsDrilldown />} />
                <Route path="bookings/floors/:projectId/:tower" element={<BookingsDrilldown />} />
                <Route
                    path="bookings/:tab"
                    element={
                        <RequireModule moduleId="bookings">
                            <Bookings />
                        </RequireModule>
                    }
                />

                <Route
                    path="party-duplicates"
                    element={
                        <RequireModule moduleId="duplicates">
                            <Duplicates />
                        </RequireModule>
                    }
                />
                <Route path="duplicates" element={<Navigate to="/layout/party-duplicates" replace />} />

                <Route
                    path="lead-import"
                    element={
                        <RequireModule moduleId="importLeads">
                            <ImportLeads />
                        </RequireModule>
                    }
                />
                <Route path="import-leads" element={<Navigate to="/layout/lead-import" replace />} />

                {/* Expenses, split into all spend, capital and operating. */}
                <Route
                    path="expenses"
                    element={
                        <RequireModule moduleId="expenses">
                            <Expenses />
                        </RequireModule>
                    }
                />
                <Route
                    path="capex"
                    element={
                        <RequireModule moduleId="expenses">
                            <Expenses />
                        </RequireModule>
                    }
                />
                <Route
                    path="opex"
                    element={
                        <RequireModule moduleId="expenses">
                            <Expenses />
                        </RequireModule>
                    }
                />

                <Route
                    path="payment-plan"
                    element={
                        <RequireModule moduleId="paymentPlan">
                            <PaymentPlans />
                        </RequireModule>
                    }
                />

                <Route
                    path="whatsapp-settings"
                    element={
                        <RequireModule moduleId="whatsapp">
                            <WhatsAppSettings />
                        </RequireModule>
                    }
                />
                <Route path="whatsapp" element={<Navigate to="/layout/whatsapp-settings" replace />} />

                <Route
                    path="calling-settings"
                    element={
                        <RequireModule moduleId="calling">
                            <CallingSettings />
                        </RequireModule>
                    }
                />
                <Route path="calling" element={<Navigate to="/layout/calling-settings" replace />} />

                <Route
                    path="integrations"
                    element={
                        <RequireModule moduleId="integrations">
                            <Integrations />
                        </RequireModule>
                    }
                />

                <Route
                    path="configuration"
                    element={
                        <RequireModule moduleId="configuration">
                            <Configuration />
                        </RequireModule>
                    }
                />

                {/* The screens the configuration index opens, each guarded by
                    the same role list that draws its card. */}
                <Route
                    path="bhk-config"
                    element={
                        <RequireConfigPage path="bhk-config">
                            <BhkConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="facing-config"
                    element={
                        <RequireConfigPage path="facing-config">
                            <FacingConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="view-config"
                    element={
                        <RequireConfigPage path="view-config">
                            <ViewConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="payment-head-config"
                    element={
                        <RequireConfigPage path="payment-head-config">
                            <PaymentHeadConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="payment-mode-config"
                    element={
                        <RequireConfigPage path="payment-mode-config">
                            <PaymentModeConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="expenditure-config"
                    element={
                        <RequireConfigPage path="expenditure-config">
                            <ExpenditureConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="project-stage-config"
                    element={
                        <RequireConfigPage path="project-stage-config">
                            <ProjectStageConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="leads-config"
                    element={
                        <RequireConfigPage path="leads-config">
                            <LeadsConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="vendor-config"
                    element={
                        <RequireConfigPage path="vendor-config">
                            <VendorConfig />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="document-settings"
                    element={
                        <RequireConfigPage path="document-settings">
                            <DocumentSettings />
                        </RequireConfigPage>
                    }
                />
                <Route
                    path="assignment-rules"
                    element={
                        <RequireConfigPage path="assignment-rules">
                            <AssignmentRules />
                        </RequireConfigPage>
                    }
                />

                {/* Two separate report screens, matching the Reports submenu. */}
                <Route path="lead-reports" element={<ReportRoute view="leads-site-visits" />} />
                <Route path="reports" element={<ReportRoute view="all" />} />

                <Route path="contact-us" element={<ContactUs />} />
                <Route path="profile" element={<Profile />} />

                {/* Config-driven modules */}
                <Route path="projects" element={<ModuleRoute moduleId="projects" config={projectsConfig} />} />
                <Route path="employees" element={<ModuleRoute moduleId="users" config={usersConfig} />} />
                <Route path="users" element={<Navigate to="/layout/employees" replace />} />
                <Route path="follow-ups" element={<ModuleRoute moduleId="followUps" config={followUpsConfig} />} />
                <Route path="call-log" element={<ModuleRoute moduleId="callLog" config={callLogConfig} />} />
                <Route path="site-visits" element={<ModuleRoute moduleId="siteVisits" config={siteVisitsConfig} />} />
                <Route path="quotations" element={<ModuleRoute moduleId="quotation" config={quotationsConfig} />} />
                <Route path="quotation" element={<Navigate to="/layout/quotations" replace />} />
                <Route path="booking-requests" element={<ModuleRoute moduleId="bookingRequests" config={bookingRequestsConfig} />} />
                <Route path="channel-partners" element={<ModuleRoute moduleId="channelPartners" config={channelPartnersConfig} />} />
                <Route path="commission-ledger" element={<ModuleRoute moduleId="commissionLedger" config={commissionsConfig} />} />
                <Route path="payout-runs" element={<ModuleRoute moduleId="payoutRuns" config={payoutRunsConfig} />} />
                {/* Tax carries the organisation's rates above the filings
                    table, so the whole screen replaces the plain module. */}
                <Route
                    path="tax-config"
                    element={
                        <RequireModule moduleId="tax">
                            <TaxConfig />
                        </RequireModule>
                    }
                />
                <Route path="tax" element={<Navigate to="/layout/tax-config" replace />} />
                <Route path="documents" element={<ModuleRoute moduleId="documents" config={documentsConfig} />} />
                <Route path="commission-inbox" element={<ModuleRoute moduleId="notifications" config={notificationsConfig} />} />
                <Route path="notifications" element={<Navigate to="/layout/commission-inbox" replace />} />

                <Route
                    path="*"
                    element={
                        <EmptyState
                            title="Page not found"
                            description="The screen you followed does not exist in this workspace."
                        />
                    }
                />
            </Route>

            <Route path="/" element={<Navigate to="/layout/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/layout/dashboard" replace />} />
        </Routes>
    </BrowserRouter>
);

export default App;
