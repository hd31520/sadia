import { createHashRouter, Navigate } from "react-router";
import Root from "../layout/Root";
import Dashboard from "../Pages/Dashboard/Dashboard";
import Sales from "../Pages/Sales/Sales";
import Products from "../Pages/Products/Products";
import Inventory from "../Pages/Inventory/Inventory";
import DueManagement from "../Pages/DueManagement/DueManagement";
import Customers from "../Pages/Customers/Customers";
import Salary from "../Pages/Salary/Salary";
import Suppliers from "../Pages/Suppliers/Suppliers";
import Workers from "../Pages/Workers/Workers";
import CardSale from "../Pages/Card/Card";
import Login from "../Pages/Auth/Login";
import RequireAuth from "../components/RequireAuth";
import { getAuthToken } from "../lib/api";

import Report from "../Pages/Report/Report";

const router = createHashRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/",
        element: (
            <RequireAuth>
                <Root />
            </RequireAuth>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: "dashboard",
                element: <Dashboard />,
            },
            {
                path: "sale",
                element: <Sales />,
            },
            {
                path: "card",
                element: <CardSale />,
            },
            {
                path: "product",
                element: <Products />,
            },
            {
                path: "inventory",
                element: <Inventory />,
            },
            {
                path: "due-management",
                element: <DueManagement />,
            },
            {
                path: "customer",
                element: <Customers />,
            },
            {
                path: "salary",
                element: <Salary />,
            },
            {
                path: "supplier",
                element: <Suppliers />,
            },
            {
                path: "worker",
                element: <Workers />,
            },
            {
                path: "report",
                element: <Report />,
            },
        ],
    },
    {
        path: "*",
        element: <Navigate to={getAuthToken() ? "/dashboard" : "/login"} replace />,
    },
]);

export default router;
