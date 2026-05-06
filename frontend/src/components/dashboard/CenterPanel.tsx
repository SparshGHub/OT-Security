import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ProcessFlow on client only to avoid SSR issues with ReactFlow
const ProcessFlow = dynamic(() => import('./process-flow/ProcessFlow'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <p>Loading Flow Diagram...</p>
    </div>
  ),
});

const CenterPanel = () => {
  // Make sure container has a reliable height for ReactFlow to compute sizes.
  return (
    <div className="flex-1 bg-card border-x border-border relative">
      <div className="absolute inset-0 min-h-[420px]">
        <ProcessFlow />
      </div>
    </div>
  );
};

export default CenterPanel;

