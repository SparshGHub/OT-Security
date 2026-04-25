"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MitigationPlaybookModalProps {
  open: boolean;
  onClose: () => void;
  eventId?: string;
}

const MitigationPlaybookModal: React.FC<MitigationPlaybookModalProps> = ({
  open,
  onClose,
  eventId,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>Mitigation Playbook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            Showing mitigation details for{" "}
            <span className="font-semibold text-blue-400">{eventId ?? "Selected Event"}</span>.
          </p>
          <p>This is a placeholder modal. You can customize it later with real playbook steps.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MitigationPlaybookModal;
