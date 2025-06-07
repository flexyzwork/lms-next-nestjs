"use client";

import React from "react";
import StoreProvider from "@/state/redux";
import { ThemeProvider } from "@/contexts/ThemeContext";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </StoreProvider>
  );
};

export default Providers;