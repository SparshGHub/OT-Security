'use client';

import React from 'react';
import { useAppState } from '@/lib/context/AppStateContext';
import { ScrollArea } from '../ui/scroll-area';

const LeftPanel = () => {
    const { topology, selectProcess, selectedProcessId } = useAppState();

    if (!topology) return <div className="w-64 p-4 bg-card border-r border-border">Loading...</div>;

    return (
        <div className="w-64 flex flex-col bg-card border-r border-border">
            <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Plant Processes</h2>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {topology.processes.map((process) => (
                        <div
                            key={process.id}
                            onClick={() => selectProcess(process.id)}
                            className={`p-3 rounded-md cursor-pointer text-sm mb-1 ${
                                selectedProcessId === process.id
                                    ? 'bg-secondary text-primary-foreground'
                                    : 'hover:bg-secondary/50'
                            }`}
                        >
                            <span className="font-mono text-muted-foreground mr-3">{process.sequence.toString().padStart(2, '0')}</span>
                            <span className="font-semibold">{process.name}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default LeftPanel;
