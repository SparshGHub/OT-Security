import type { Rule, Component } from '../types';
import { validateAttackFeasibility, ValidationResult } from './validationEngine';

const compare = (a: any, operator: string, b: any): boolean => {
    switch (operator) {
        case '>': return a > b;
        case '<': return a < b;
        case '>=': return a >= b;
        case '<=': return a <= b;
        case '==': return a == b;
        case '!=': return a != b;
        case 'in': return Array.isArray(b) ? b.includes(a) : a === b;
        case 'not_in': return Array.isArray(b) ? !b.includes(a) : a !== b;
        default: return false;
    }
};

const checkCondition = (condition: any, attack: any, component: Component): boolean => {
    const metric = condition.metric || condition.type || 'param';
    const operator = condition.operator || '==';
    const value = condition.value;

    // Normalize commonly used fields
    const params = attack.params || {};
    const attackType = attack.attack_type || attack.attackType || '';

    switch (metric) {
        case 'absolute': {
            const paramName = condition.param || 'value';
            const raw = params[paramName];
            if (raw === undefined || raw === null) return false;
            const numericValue = typeof raw === 'number' ? raw : parseFloat(String(raw));
            if (isNaN(numericValue)) return false;
            return compare(numericValue, operator, Number(value));
        }

        case 'param': {
            const paramName = condition.param;
            if (!paramName) return false;
            const actual = params[paramName];
            return compare(actual, operator, value);
        }

        case 'authz': {
            const role = params.source_role || params.source || params.attackSource;
            if (!role) return false;
            return compare(role, operator, value);
        }

        case 'component': {
            const prop = condition.property;
            if (!prop) return false;
            const actual = (component as any)[prop];
            return compare(actual, operator, value);
        }

        case 'attack_type': {
            return compare(attackType, operator, value);
        }

        default:
            // Fallback: try to compare attack type or a top-level param
            if (condition.field && (attack as any)[condition.field] !== undefined) {
                return compare((attack as any)[condition.field], operator, value);
            }
            return false;
    }
};

/**
 * Evaluate rules and return fired rules.
 * Rules are filtered by `applies_to.component_types` and `trigger.event` when present.
 */
export const evaluateRules = (rules: Rule[], attack: any, component: Component): Rule[] => {
    const firedRules: Rule[] = [];

    for (const rule of rules) {
        if (!rule.enabled) continue;

        // Check applies_to component types if present
        if (rule.applies_to && Array.isArray(rule.applies_to.component_types) && rule.applies_to.component_types.length > 0) {
            const allowed = rule.applies_to.component_types.map((s: string) => s.toLowerCase());
            if (!allowed.includes(component.type.toLowerCase())) continue;
        }

        // Check trigger event if present (match attack_type)
        if (rule.trigger && rule.trigger.event) {
            const expected = String(rule.trigger.event);
            const actual = attack.attack_type || attack.event || '';
            if (expected !== actual) continue;
        }

        const logic = (rule.conditions && (rule.conditions.logic || rule.conditions.logic === 'any' ? rule.conditions.logic : 'all')) || 'all';
        const clauses = (rule.conditions && rule.conditions.clauses) || [];

        let conditionsMet = true;
        if (logic === 'any') {
            conditionsMet = clauses.some((c: any) => checkCondition(c, attack, component));
        } else {
            conditionsMet = clauses.every((c: any) => checkCondition(c, attack, component));
        }

        if (conditionsMet) firedRules.push(rule);
    }

    return firedRules;
};

/**
 * Combined helper to evaluate rules and validate feasibility.
 * Returns fired rules and feasibility result for caller convenience.
 */
export const evaluateRulesWithFeasibility = async (
    rules: Rule[],
    attack: any,
    component: Component
): Promise<{ firedRules: Rule[]; feasibility: ValidationResult }> => {
    const feasibility = await validateAttackFeasibility(attack, component);
    const firedRules = feasibility.isValid ? evaluateRules(rules, attack, component) : [];
    return { firedRules, feasibility };
};

export default evaluateRules;
