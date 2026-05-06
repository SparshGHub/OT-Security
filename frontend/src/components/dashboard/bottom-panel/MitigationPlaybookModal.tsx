// frontend/src/components/dashboard/bottom-panel/MitigationPlaybookModal.tsx
'use client';

import React from 'react';
import { useAppState } from '@/lib/context/AppStateContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const MitigationPlaybookModal: React.FC = () => {
  const { mitigations, activeMitigationId, closeMitigationModal } = useAppState();

  if (!activeMitigationId) return null;

  const mitigation = mitigations.find((m) => m.id === activeMitigationId);
  if (!mitigation) return null;

  const steps = Array.isArray(mitigation.steps) ? mitigation.steps.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];

  return (
    <Dialog open={!!activeMitigationId} onOpenChange={(val) => { if (!val) closeMitigationModal(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mitigation.name}</DialogTitle>
          <DialogDescription>
            Recommended mitigation playbook for the fired rule(s).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 mt-4">
          <div className="space-y-4">
            {steps.length === 0 && <div className="text-sm text-muted-foreground px-2">No steps available.</div>}
            {steps.map((step) => (
              <div key={step.order} className="p-3 bg-muted/10 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Step {step.order}</div>
                  <div className="text-xs text-muted-foreground">{step.action}</div>
                </div>
                <div className="pt-2 text-sm text-muted-foreground">
                  {step.operator_notes}
                </div>
                <Separator className="my-2" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MitigationPlaybookModal;
