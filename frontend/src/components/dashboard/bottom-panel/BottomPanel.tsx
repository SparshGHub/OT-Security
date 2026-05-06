"use client";

import React from "react";
import EventTimeline from "./EventTimeline";

const BottomPanel: React.FC = () => {
  return (
    <div className="h-full bg-background border-t border-border">
      <EventTimeline />
    </div>
  );
};

export default BottomPanel;
