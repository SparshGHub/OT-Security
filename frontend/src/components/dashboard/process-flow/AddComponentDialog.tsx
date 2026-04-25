'use client';

import * as React from 'react';
import { useAppState } from '@/lib/context/AppStateContext';
import type { Component as PlantComponent } from '@/lib/types';

type Props = {
  processId: string;
  onNodeCreated?: (node: { id: string; data: PlantComponent }) => void;
};

const DEFAULT_FORM_STATE: Partial<PlantComponent> = {
  name: '',
  type: 'PLC',
  network_zone: 'Control',
  ip: '',
  criticality: 'medium',
};

export default function AddComponentDialog({ processId, onNodeCreated }: Props) {
  const { addComponent } = useAppState();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<Partial<PlantComponent>>(DEFAULT_FORM_STATE);

  const resetForm = () => setForm(DEFAULT_FORM_STATE);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      process_id: processId,
      name: form.name?.trim() || 'New Component',
      type: (form.type as PlantComponent['type']) ?? 'PLC',
      network_zone: form.network_zone ?? 'Control',
      ip: form.ip?.trim() || null,
      criticality: form.criticality ?? 'medium',
    };

    try {
      const newComp = await addComponent(payload); // returns Component

      if (onNodeCreated) {
        onNodeCreated({ id: newComp.id, data: newComp });
      }
    } catch (err) {
      console.error('Failed to add component:', err);
    }

    setOpen(false);
    resetForm();
  };

  const handleChange = <K extends keyof PlantComponent>(
    field: K,
    value: PlantComponent[K]
  ) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm rounded-md border border-white/20 bg-[#0a1a3d] text-white hover:bg-[#11244d] transition-colors"
      >
        + Add Component
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => {
          setOpen(false);
          resetForm();
        }}
      />

      <div className="relative z-10 w-full max-w-lg rounded-lg border border-[#0a1a3d] bg-[#0f1e47] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Component</h2>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            className="grid h-8 w-8 place-items-center rounded hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <span className="text-2xl text-white">×</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-1">
              Name
            </label>
            <input
              id="name"
              required
              autoFocus
              value={form.name ?? ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded border border-[#0a1a3d] bg-[#172b57] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#1e40af]"
            />
          </div>

          {/* Type & Zone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-white/90 mb-1">
                Type
              </label>
              <select
                id="type"
                value={form.type ?? 'PLC'}
                onChange={(e) => handleChange('type', e.target.value as PlantComponent['type'])}
                className="w-full rounded border border-[#0a1a3d] bg-[#172b57] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#1e40af]"
              >
                <option value="DCS_Controller">DCS Controller</option>
                <option value="PLC">PLC</option>
                <option value="Field_Device_Sensor">Field Device (Sensor)</option>
                <option value="Field_Device_Actuator">Field Device (Actuator)</option>
                <option value="Operator_HMI">Operator HMI</option>
                <option value="Engineering_Station">Engineering Station</option>
                <option value="Historian">Historian</option>
                <option value="Network_Switch">Network Switch</option>
                <option value="Firewall">Firewall</option>
              </select>
            </div>

            <div>
              <label htmlFor="network_zone" className="block text-sm font-medium text-white/90 mb-1">
                Network Zone
              </label>
              <select
                id="network_zone"
                value={form.network_zone ?? 'Control'}
                onChange={(e) =>
                  handleChange('network_zone', e.target.value as PlantComponent['network_zone'])
                }
                className="w-full rounded border border-[#0a1a3d] bg-[#172b57] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#1e40af]"
              >
                <option value="Field">Field</option>
                <option value="Control">Control</option>
                <option value="DMZ">DMZ</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {/* IP & Criticality */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ip" className="block text-sm font-medium text-white/90 mb-1">
                IP (Optional)
              </label>
              <input
                id="ip"
                placeholder="192.168.1.100"
                value={form.ip ?? ''}
                onChange={(e) => handleChange('ip', e.target.value || null)}
                className="w-full rounded border border-[#0a1a3d] bg-[#172b57] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#1e40af]"
              />
            </div>

            <div>
              <label htmlFor="criticality" className="block text-sm font-medium text-white/90 mb-1">
                Criticality
              </label>
              <select
                id="criticality"
                value={form.criticality ?? 'medium'}
                onChange={(e) =>
                  handleChange('criticality', e.target.value as PlantComponent['criticality'])
                }
                className="w-full rounded border border-[#0a1a3d] bg-[#172b57] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#1e40af]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-md border border-white/20 bg-transparent text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#1e40af] text-white hover:bg-[#1e3a8a] transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
