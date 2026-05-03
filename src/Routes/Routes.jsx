import { Suspense, lazy } from "react";
import { createHashRouter, Navigate } from "react-router";
import Root from "../layout/Root";
import RequireAuth from "../components/RequireAuth";
import RouteErrorScreen from "../components/RouteErrorScreen";
import { getAuthToken } from "../lib/api";
import {
    CART_ROUTE_ALIAS_SEGMENTS,
    CART_ROUTE_PATH,
    CART_ROUTE_SEGMENT,
} from "../lib/cart-route";

const Dashboard = lazy(() => import("../Pages/Dashboard/Dashboard"));
const Sales = lazy(() => import("../Pages/Sales/Sales"));
const Products = lazy(() => import("../Pages/Products/Products"));
const Inventory = lazy(() => import("../Pages/Inventory/Inventory"));
const DueManagement = lazy(() => import("../Pages/DueManagement/DueManagement"));
const Customers = lazy(() => import("../Pages/Customers/Customers"));
const Salary = lazy(() => import("../Pages/Salary/Salary"));
const Suppliers = lazy(() => import("../Pages/Suppliers/Suppliers"));
const Workers = lazy(() => import("../Pages/Workers/Workers"));
const WorkerAttendanceHistory = lazy(() => import("../Pages/Workers/WorkerAttendanceHistory"));
const CartSale = lazy(() => import("../Pages/Card/Card"));
const Login = lazy(() => import("../Pages/Auth/Login"));
const Report = lazy(() => import("../Pages/Report/Report"));
const Settings = lazy(() => import("../Pages/Settings/Settings"));

function RouteFallback() {
    return (
        <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-border/60 bg-card/80 text-sm text-muted-foreground shadow-sm">
            Loading page...
        </div>
    );
}

function withSuspense(element) {
    return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createHashRouter([
    {
        path: "/login",
        element: withSuspense(<Login />),
        errorElement: <RouteErrorScreen />,
    },
    {
        path: "/",
        element: (
            <RequireAuth>
                <Root />
            </RequireAuth>
        ),
        errorElement: <RouteErrorScreen />,
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: "dashboard",
                element: withSuspense(<Dashboard />),
            },
            {
                path: "sale",
                element: withSuspense(<Sales />),
            },
            {
                path: CART_ROUTE_SEGMENT,
                element: withSuspense(<CartSale />),
            },
            ...CART_ROUTE_ALIAS_SEGMENTS.map((alias) => ({
                path: alias,
                element: <Navigate to={CART_ROUTE_PATH} replace />,
            })),
            {
                path: "product",
                element: withSuspense(<Products />),
            },
            {
                path: "inventory",
                element: withSuspense(<Inventory />),
            },
            {
                path: "due-management",
                element: withSuspense(<DueManagement />),
            },
            {
                path: "customer",
                element: withSuspense(<Customers />),
            },
            {
                path: "salary",
                element: (
                    <RequireAuth allowedRoles={["admin"]}>
                        {withSuspense(<Salary />)}
                    </RequireAuth>
                ),
            },
            {
                path: "supplier",
                element: withSuspense(<Suppliers />),
            },
            {
                path: "worker",
                element: (
                    <RequireAuth allowedRoles={["admin"]}>
                        {withSuspense(<Workers />)}
                    </RequireAuth>
                ),
            },
            {
                path: "worker/:workerId/history",
                element: (
                    <RequireAuth allowedRoles={["admin"]}>
                        {withSuspense(<WorkerAttendanceHistory />)}
                    </RequireAuth>
                ),
            },
            {
                path: "report",
                element: withSuspense(<Report />),
            },
            {
                path: "settings",
                element: withSuspense(<Settings />),
            },
        ],
    },
    {
        path: "*",
        element: <Navigate to={getAuthToken() ? "/dashboard" : "/login"} replace />,
    },
]);

export default router;
