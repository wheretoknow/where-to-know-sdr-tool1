import { createBrowserRouter } from "react-router";
import HomePage from "../src/pages/home/HomePage.jsx";
import LoginPage from "../src/pages/login/LoginPage.jsx";

/** 客户端路由表（与页面组件解耦，便于扩展更多 path） */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
