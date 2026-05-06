"use client";

import React from "react";
import LoginPage from "@/components/auth/LoginPage";
import MainDashboardWrapper from "@/components/layout/MainDashboardWrapper";
import { useAppState } from "@/lib/context/AppStateContext";

export default function Home() {
  const { user } = useAppState();

  if (!user) {
    return <LoginPage />;
  }

  return <MainDashboardWrapper />;
}
