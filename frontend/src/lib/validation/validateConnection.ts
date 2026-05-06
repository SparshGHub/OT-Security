import { Component } from '../types';
import connectionRulesData from './connectionRules.json';

type RuleAction = 'allow' | 'deny' | 'warn';

export interface ValidationResult {
  allowed: boolean;
  action: RuleAction;
  error?: {
    code: string;
    message: string;
  };
  warning?: {
    code: string;
    message: string;
  };
}

interface MatchConditions {
  always?: boolean;
  same_component?: boolean;
  from_zones?: string[];
  to_zones?: string[];
  same_zone_only?: boolean;
  from_types_any_of?: string[];
  to_types_any_of?: string[];
  zone_pairs?: { from: string; to: string }[];
}

interface Rule {
  id: string;
  priority: number;
  applies_to_profiles: string[];
  action: RuleAction;
  match: MatchConditions;
  error?: { code: string; message: string };
  warning?: { code: string; message: string };
}

export function validateConnection(
  source: Component,
  target: Component,
  profile: string = 'strict_purdue'
): ValidationResult {
  const rules: Rule[] = connectionRulesData.rules as Rule[];

  // 1. Filter rules by active profile
  const activeRules = rules.filter((r) => r.applies_to_profiles.includes(profile));

  // 2. Sort by priority (descending)
  activeRules.sort((a, b) => b.priority - a.priority);

  // 3. Evaluate each rule. "first_match_wins"
  for (const rule of activeRules) {
    if (matchesRule(source, target, rule.match)) {
      if (rule.action === 'deny') {
        return {
          allowed: false,
          action: 'deny',
          error: rule.error,
        };
      } else if (rule.action === 'warn') {
        return {
          allowed: true, // we allow it but return a warning
          action: 'warn',
          warning: rule.warning,
        };
      } else if (rule.action === 'allow') {
        return {
          allowed: true,
          action: 'allow',
        };
      }
    }
  }

  // Fallback (though R900_DEFAULT_DENY should catch everything if it works)
  return {
    allowed: false,
    action: 'deny',
    error: {
      code: 'UNHANDLED_CONNECTION',
      message: 'Connection was not matched by any rule.',
    },
  };
}

function matchesRule(source: Component, target: Component, match: MatchConditions): boolean {
  if (match.always) {
    return true;
  }

  if (match.same_component === true) {
    if (source.id !== target.id) return false;
  }

  if (match.same_component === false) {
    if (source.id === target.id) return false;
  }

  if (match.from_zones && match.from_zones.length > 0) {
    if (!match.from_zones.includes(source.network_zone)) return false;
  }

  if (match.to_zones && match.to_zones.length > 0) {
    if (!match.to_zones.includes(target.network_zone)) return false;
  }

  if (match.same_zone_only === true) {
    if (source.network_zone !== target.network_zone) return false;
  }

  if (match.from_types_any_of && match.from_types_any_of.length > 0) {
    if (!match.from_types_any_of.includes(source.type)) return false;
  }

  if (match.to_types_any_of && match.to_types_any_of.length > 0) {
    if (!match.to_types_any_of.includes(target.type)) return false;
  }

  if (match.zone_pairs && match.zone_pairs.length > 0) {
    const pairMatched = match.zone_pairs.some(
      (pair) => pair.from === source.network_zone && pair.to === target.network_zone
    );
    if (!pairMatched) return false;
  }

  // If we reach here and it's not simply an empty match block without "always", we return true since all specified conditions matched.
  // We need to ensure that the rule had at least one condition to begin with (so we don't accidentally match an empty object to everything unless 'always' is specified).
  const hasConditions = !!(
    match.same_component !== undefined ||
    (match.from_zones && match.from_zones.length > 0) ||
    (match.to_zones && match.to_zones.length > 0) ||
    match.same_zone_only !== undefined ||
    (match.from_types_any_of && match.from_types_any_of.length > 0) ||
    (match.to_types_any_of && match.to_types_any_of.length > 0) ||
    (match.zone_pairs && match.zone_pairs.length > 0)
  );

  return hasConditions;
}
