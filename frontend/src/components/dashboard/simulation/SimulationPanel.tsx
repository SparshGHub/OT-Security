'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ATTACK_TO_SOURCES, COMPONENT_TO_ATTACKS } from '@/lib/attackConstants';
import { useAppState } from '@/lib/context/AppStateContext';
import { Component } from '@/lib/types';
import React, { useEffect, useMemo, useState } from 'react';

/**
 * SimulationPanel must be a client component because it uses hooks.
 * This file path matches the import in RightPanel:
 *   '@/components/dashboard/simulation/SimulationPanel'
 */

interface Props {
  component: Component;
}

const SimulationPanel = ({ component }: Props) => {
  const { runSimulation } = useAppState();
  const { toast } = useToast();

  const allAttackOptions = useMemo(() => {
    const flat = Object.values(COMPONENT_TO_ATTACKS).flat();
    return Array.from(new Set(flat));
  }, []);

  const allSourceRoles = useMemo(() => {
    const flat = Object.values(ATTACK_TO_SOURCES).flat();
    return Array.from(new Set(flat));
  }, []);

  const [attackType, setAttackType] = useState<string>('');
  const [value, setValue] = useState('68');
  const [sourceRole, setSourceRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAttackType((prev) => (prev ? prev : allAttackOptions[0] || ''));
  }, [allAttackOptions]);

  useEffect(() => {
    setSourceRole((prev) => (prev ? prev : allSourceRoles[0] || ''));
  }, [allSourceRoles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const params: Record<string, unknown> = {
      value: parseFloat(value),
      source_role: sourceRole,
    };

    if (!attackType) {
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: 'No attack type available for this component.',
      });
      setIsLoading(false);
      return;
    }

    if (!sourceRole) {
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: 'Please select an attack source.',
      });
      setIsLoading(false);
      return;
    }

    try {
      await runSimulation({
        component_id: component.id,
        attack_type: attackType,
        params,
      });
      toast({
        title: 'Simulation Successful',
        description: `Attack '${attackType}' on '${component.name}' completed.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulate Attack</CardTitle>
        <CardDescription>
          Configure and launch a simulated attack on this component.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="attackType">Attack Type</Label>
            <Select
              value={attackType}
              onValueChange={setAttackType}
              disabled={!allAttackOptions.length}
            >
              <SelectTrigger id="attackType">
                <SelectValue placeholder={allAttackOptions.length ? 'Select an attack' : 'No attacks available'} />
              </SelectTrigger>
              <SelectContent>
                {allAttackOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="value">Parameter Value</Label>
            <Input
              id="value"
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="sourceRole">Source Role</Label>
            <Select
              value={sourceRole}
              onValueChange={setSourceRole}
              disabled={!allSourceRoles.length}
            >
              <SelectTrigger id="sourceRole">
                <SelectValue placeholder={allSourceRoles.length ? 'Select a source' : 'No sources available'} />
              </SelectTrigger>
              <SelectContent>
                {allSourceRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !allAttackOptions.length}>
            {isLoading ? 'Running...' : 'Simulate Attack'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SimulationPanel;

