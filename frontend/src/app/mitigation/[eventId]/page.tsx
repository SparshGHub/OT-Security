"use client";

import React from "react";

interface MitigationDetailsPageProps {
  params: {
    eventId: string;
  };
}

export default function MitigationDetailsPage({
  params,
}: MitigationDetailsPageProps) {
  React.useEffect(() => {
    // Add an extra history entry so browser back can be captured in this tab.
    window.history.pushState({ mitigationTab: true }, "", window.location.href);

    const handlePopState = () => {
      if (window.opener && !window.opener.closed) {
        window.close();
        if (!window.closed) {
          window.location.href = "/";
        }
        return;
      }
      window.location.href = "/";
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Mitigation Details</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder page for event: {params.eventId}
        </p>
      </div>
    </main>
  );
}
