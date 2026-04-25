import { ATTACK_TO_SOURCES, COMPONENT_TO_ATTACKS, ZONE_TO_SOURCES } from '../lib/attackConstants';
import type { Component } from '../types';

export interface ValidationViolation {
  layer: 'physical' | 'tooling' | 'topology' | 'protocol';
  message: string;
  severity: 'blocking' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
}

// Derive event severity incorporating component criticality, component type, and rule severity
export const deriveCriticalSeverity = (
  component: Component,
  ruleSeverity: 'info' | 'alert' | 'critical' = 'info'
): { severity: 'info' | 'alert' | 'critical'; score: number } => {
  const compCritWeight: Record<Component['criticality'], number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };

  const ruleWeight: Record<'info' | 'alert' | 'critical', number> = {
    info: 0,
    alert: 1.5,
    critical: 3,
  };

  const controlPlaneTypes = new Set([
    'sensor',
    'actuator',
    'plc',
    'dcs_controller',
    'hmi',
  ]);

  const componentWeight = compCritWeight[component.criticality] ?? 0;
  const ruleSeverityWeight = ruleWeight[ruleSeverity] ?? 0;
  const typeBonus = controlPlaneTypes.has((component.type || '').toLowerCase()) ? 0.5 : 0;

  // Weighted blend: component criticality is primary, rule severity secondary, plus type bonus
  const rawScore = 0.6 * componentWeight + 0.35 * ruleSeverityWeight + typeBonus;
  const score = Math.max(0, Math.min(3, rawScore));

  const severity = score >= 2.1 ? 'critical' : score >= 0.9 ? 'alert' : 'info';

  return { severity, score };
};

/**
 * Lightweight feasibility validator based on provided attack constants.
 * - Checks component susceptibility
 * - Checks source capability for the attack type
 * - Checks zone reachability
 */
export const validateAttackFeasibility = async (
  attack: any,
  component: Component
): Promise<ValidationResult> => {
  const violations: ValidationViolation[] = [];

  const rawType = (attack.attack_type || attack.attackType || '').trim();
  const attackType = rawType;

  const params = attack.params || {};
  const sourceRaw = params.source_role || params.attackSource || params.source || attack.source || '';
  const source = String(sourceRaw).trim();
  const sourceUpper = source.toUpperCase();

  const findAttackKey = (value: string) => {
    if (!value) return '';
    const exact = ATTACK_TO_SOURCES[value];
    if (exact) return value;
    const matchAttackKey = Object.keys(ATTACK_TO_SOURCES).find((k) => k.toLowerCase() === value.toLowerCase());
    return matchAttackKey || value;
  };

  if (!attackType) {
    violations.push({
      layer: 'protocol',
      message: 'Attack type is missing.',
      severity: 'blocking'
    });
  }

  // Physical feasibility (component → attacks)
  const componentTypeKey = component.type?.toLowerCase();
  const allowedAttacks = componentTypeKey ? COMPONENT_TO_ATTACKS[componentTypeKey] : undefined;
  if (!allowedAttacks) {
    violations.push({
      layer: 'physical',
      message: `Component type '${component.type}' has no known attack mapping in constants.` ,
      severity: 'blocking'
    });
  } else if (attackType && !allowedAttacks.includes(attackType)) {
    violations.push({
      layer: 'physical',
      message: `Component type '${component.type}' is not susceptible to '${attackType}'.`,
      severity: 'blocking'
    });
  }

  // Tooling / source capability (attack → sources)
  const attackKey = findAttackKey(attackType);
  const capableSources = attackKey ? ATTACK_TO_SOURCES[attackKey] : undefined;
  if (!capableSources) {
    if (attackType) {
      violations.push({
        layer: 'tooling',
        message: `No capable source mapping found for attack '${attackType}'.`,
        severity: 'blocking'
      });
    }
  } else if (source && !capableSources.map((s) => s.toUpperCase()).includes(sourceUpper)) {
    violations.push({
      layer: 'tooling',
      message: `Source '${source}' not listed as capable for '${attackType}'.`,
      severity: 'blocking'
    });
  }

  // Topology / zone reachability (zone → sources)
  const normalizeZone = (zone?: string) => {
    if (!zone) return '';
    const z = zone.trim();
    const direct = ZONE_TO_SOURCES[z];
    if (direct) return z;
    const matchKey = Object.keys(ZONE_TO_SOURCES).find((key) => key.toLowerCase() === z.toLowerCase());
    return matchKey || z;
  };

  const zoneKey = normalizeZone(component.network_zone);
  const zoneSources = zoneKey ? ZONE_TO_SOURCES[zoneKey] : undefined;

  if (!zoneSources) {
    violations.push({
      layer: 'topology',
      message: `Zone '${component.network_zone}' has no reachability mapping in constants.`,
      severity: 'blocking'
    });
  } else if (source && !zoneSources.map((s) => s.toUpperCase()).includes(sourceUpper)) {
    violations.push({
      layer: 'topology',
      message: `Source '${source}' cannot reach zone '${component.network_zone}'.`,
      severity: 'blocking'
    });
  }

  // Missing source should be blocking because capability cannot be assessed
  if (!source) {
    violations.push({
      layer: 'tooling',
      message: 'Attack source is missing; capability cannot be validated.',
      severity: 'blocking'
    });
  }

  const isValid = !violations.some((v) => v.severity === 'blocking');

  return { isValid, violations };
};

export default validateAttackFeasibility;
