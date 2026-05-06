import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import type { Component, Rule } from '../types';
import { evaluateRulesWithFeasibility } from './ruleEngine';
import { deriveCriticalSeverity } from './validationEngine';

/**
 * Runs a simulation transaction:
 * - Fetches component and rules
 * - Inserts an attack record
 * - Evaluates rules and inserts events
 * - Returns fired rules, events, and matching mitigations
 */
export const runSimulation = async (
  component_id: string,
  attack_type: string,
  params: any,
  initiated_by: string
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Fetch component and all enabled rules
    const componentRes = await client.query('SELECT * FROM components WHERE id = $1', [component_id]);
    if (componentRes.rows.length === 0) {
      throw new Error('Component not found');
    }
    const component: Component = componentRes.rows[0];

    const rulesRes = await client.query('SELECT * FROM rules WHERE enabled = TRUE');
    const allRules: Rule[] = rulesRes.rows;

    // 2) Create the attack record
    const attack_id = uuidv4();
    const attack = {
      id: attack_id,
      component_id,
      attack_type,
      params,
      initiated_by,
      timestamp: new Date(),
    };

    await client.query(
      'INSERT INTO attacks (id, component_id, attack_type, params, initiated_by, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        attack.id,
        attack.component_id,
        attack.attack_type,
        JSON.stringify(attack.params), // ensure jsonb
        attack.initiated_by,
        attack.timestamp,
      ]
    );

    // 3) Evaluate rules against the attack and validate feasibility
    const { firedRules, feasibility } = await evaluateRulesWithFeasibility(allRules, attack, component);

    // 4) Create event records for each fired rule (or a blocked event if infeasible)
    const events: Array<{
      id: string;
      attack_id: string;
      component_id: string;
      rule_id: string | null;
      type: string;
      payload: { message: string };
      severity: string;
      timestamp: Date;
    }> = [];
    if (!feasibility.isValid) {
      // Insert a single ATTACK_BLOCKED event summarizing violations
      const event_id = uuidv4();
      const payloadMsg = `Attack '${attack.attack_type}' blocked: ${feasibility.violations.map(v=>v.message).join('; ')}`;
      // Infeasible attacks always have INFO severity regardless of component criticality
      const event = {
        id: event_id,
        attack_id: attack.id,
        component_id: component.id,
        rule_id: null,
        type: 'ATTACK_BLOCKED',
        payload: { message: payloadMsg },
        severity: 'info',
        timestamp: new Date(),
      };

      await client.query(
        'INSERT INTO events (id, attack_id, component_id, rule_id, type, payload, severity, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          event.id,
          event.attack_id,
          event.component_id,
          event.rule_id,
          event.type,
          JSON.stringify(event.payload),
          event.severity,
          event.timestamp,
        ]
      );

      events.push(event);
    } else {
      if (firedRules.length === 0) {
        const event_id = uuidv4();
        const recordedSeverity = deriveCriticalSeverity(component, 'info').severity;
        const event = {
          id: event_id,
          attack_id: attack.id,
          component_id: component.id,
          rule_id: null,
          type: 'ATTACK_RECORDED',
          payload: {
            message: `Attack '${attack.attack_type}' recorded for component '${component.name}'`,
          },
          severity: recordedSeverity,
          timestamp: new Date(),
        };

        await client.query(
          'INSERT INTO events (id, attack_id, component_id, rule_id, type, payload, severity, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            event.id,
            event.attack_id,
            event.component_id,
            event.rule_id,
            event.type,
            JSON.stringify(event.payload), // ensure jsonb
            event.severity,
            event.timestamp,
          ]
        );

        events.push(event);
      }

      for (const rule of firedRules) {
        const event_id = uuidv4();
        const ruleSeverity = deriveCriticalSeverity(component, rule.severity as any).severity;
        const event = {
          id: event_id,
          attack_id: attack.id,
          component_id: component.id,
          rule_id: rule.id,
          type: 'RULE_TRIGGER',
          payload: {
            message: `Rule '${rule.name}' fired for component '${component.name}'`,
          },
          severity: ruleSeverity,
          timestamp: new Date(),
        };

        await client.query(
          'INSERT INTO events (id, attack_id, component_id, rule_id, type, payload, severity, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            event.id,
            event.attack_id,
            event.component_id,
            event.rule_id,
            event.type,
            JSON.stringify(event.payload), // ensure jsonb
            event.severity,
            event.timestamp,
          ]
        );

        events.push(event);
      }
    }
    // 5) Fetch associated mitigations for fired rules (parameterized)
    const firedRuleIds = firedRules.map((r) => r.id);
    let mitigations: any[] = [];

    if (firedRuleIds.length > 0) {
      // Select mitigations where any applies_to.rule_ids contains one of the fired rule IDs
      // Uses jsonb_array_elements_text for parameterized matching
      const mitigationsRes = await client.query(
        `
        SELECT m.*
        FROM mitigations m
        WHERE EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(m.applies_to->'rule_ids') AS rid
          WHERE rid = ANY($1::text[])
        )
        `,
        [firedRuleIds]
      );
      mitigations = mitigationsRes.rows;
    }

    await client.query('COMMIT');

    return {
      attack_id: attack.id,
      events,
      rules_fired: firedRules,
      mitigations,
      feasibility,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in simulation transaction:', error);
    throw error;
  } finally {
    client.release();
  }
};

