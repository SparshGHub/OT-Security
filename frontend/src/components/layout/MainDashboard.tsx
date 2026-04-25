'use client';
import React, { useEffect } from 'react';
import Header from './Header';
import LeftPanel from '../dashboard/LeftPanel';
import CenterPanel from '../dashboard/CenterPanel';
import RightPanel from '../dashboard/RightPanel';
import BottomPanel from '../dashboard/bottom-panel/BottomPanel';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useAppState } from '@/lib/context/AppStateContext';
import { useToast } from '../ui/use-toast';

const MainDashboard = () => {
  const { loadInitialData, logout, topology } = useAppState();
  const { toast } = useToast();

  useEffect(() => {
    // This effect runs only once on the client side after the component mounts.
    const fetchData = async () => {
      try {
        await loadInitialData();
      } catch (error) {
        console.error("Failed to load initial data:", error);
        toast({
          variant: "destructive",
          title: "API Connection Failed",
          description: "Could not connect to the backend server. Please ensure it is running and accessible.",
        });
        // Log out the user to return to the login screen, preventing an infinite loading state.
        logout();
      }
    };
    
    // Only fetch data if topology is not already loaded
    if (!topology) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topology]); // Depend on topology to avoid re-fetching on every render

  if (!topology) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <p className="text-lg">Loading Simulator...</p>
                <p className="text-sm text-muted-foreground">Connecting to backend services...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="vertical" className="flex-1">
          <ResizablePanel defaultSize={75}>
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={20}>
                <LeftPanel />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={55}>
                <CenterPanel />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25}>
                <RightPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25}>
            <BottomPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
};

export default MainDashboard;

