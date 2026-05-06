'use client';
import React from 'react';
import { useAppState } from '@/lib/context/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import SimulationPanel from './simulation/SimulationPanel';
import { ScrollArea } from '../ui/scroll-area';

const RightPanel = () => {
    const { selectedComponent } = useAppState();

    return (
        <div className="w-96 bg-card border-l border-border flex flex-col">
            <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Details & Simulation</h2>
            </div>
            <ScrollArea className='flex-1'>
            {selectedComponent ? (
                <div className="p-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{selectedComponent.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <p><strong>Type:</strong> {selectedComponent.type}</p>
                            <p><strong>Zone:</strong> {selectedComponent.network_zone}</p>
                            <p><strong>IP:</strong> {selectedComponent.ip || 'N/A'}</p>
                            <p><strong>Criticality:</strong> <span className='capitalize'>{selectedComponent.criticality}</span></p>
                        </CardContent>
                    </Card>
                    <Separator />
                    <SimulationPanel component={selectedComponent} />
                </div>
            ) : (
                <div className="p-4 text-center text-muted-foreground mt-8">
                    Select a component on the map to see its details.
                </div>
            )}
            </ScrollArea>
        </div>
    );
};

export default RightPanel;
