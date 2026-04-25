-- Revised detection rules with clear hierarchy to prevent duplicate alerts
-- Strategy: Each rule has a specific, non-overlapping purpose

TRUNCATE TABLE rules RESTART IDENTITY CASCADE;

-- ============================================================================
-- TIER 1: SAFETY-CRITICAL RULES (Physical Safety)
-- Priority: CRITICAL | Action: BLOCK + ALERT
-- Purpose: Prevent immediate physical harm to equipment or personnel
-- ============================================================================

INSERT INTO rules (id, name, description, applies_to, trigger, conditions, severity, actions, enabled, source, version, metadata) VALUES

-- Rule 1A: Critical High Limit (Safety Interlock)
('b1a9b8e0-3c7f-4b1e-8e3b-9e4a3a3d2c1d', 
 'Safety Interlock: Drum Level Critical High', 
 'Drum level setpoint exceeds the critical high safety threshold (>65%). This triggers an automatic safety interlock.',
 '{"component_types": ["DCS_Controller"], "setpoint_names": ["Drum Level SP"]}',
 '{"event": "WRITE"}',
 '{"logic": "any", "clauses": [{"metric": "absolute", "operator": ">", "value": 65}]}',
 'critical',
 '[{"type": "BLOCK_WRITE"}, {"type": "RAISE_ESD_INTERLOCK_REQUEST"}, {"type": "HIGH_ALERT_PANEL_FLASH"}]',
 true,
 'ICS_SAFETY_v2',
 'v2',
 '{"tier": "SAFETY", "rationale": "Critically high drum level risks water carryover into turbine. Auto-blocked.", "priority": 1}'),

-- Rule 1B: Critical Low Limit (Safety Interlock)
('c2d4e8f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
 'Safety Interlock: Drum Level Critical Low',
 'Drum level setpoint below critical low safety threshold (<45%). This triggers an automatic safety interlock.',
 '{"component_types": ["DCS_Controller"], "setpoint_names": ["Drum Level SP"]}',
 '{"event": "WRITE"}',
 '{"logic": "any", "clauses": [{"metric": "absolute", "operator": "<", "value": 45}]}',
 'critical',
 '[{"type": "BLOCK_WRITE"}, {"type": "RAISE_ESD_INTERLOCK_REQUEST"}, {"type": "HIGH_ALERT_PANEL_FLASH"}]',
 true,
 'ICS_SAFETY_v2',
 'v2',
 '{"tier": "SAFETY", "rationale": "Critically low drum level risks tube overheating and boiler explosion. Auto-blocked.", "priority": 1}'),

-- Rule 1C: Turbine Overspeed Protection
('d3e5f8a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a',
 'Safety Interlock: Turbine Overspeed',
 'Turbine speed setpoint exceeds maximum allowable speed (>3150 RPM).',
 '{"component_types": ["DCS_Controller"], "setpoint_names": ["Turbine Speed SP"]}',
 '{"event": "WRITE"}',
 '{"logic": "any", "clauses": [{"metric": "absolute", "operator": ">", "value": 3150}]}',
 'critical',
 '[{"type": "BLOCK_WRITE"}, {"type": "HIGH_ALERT_PANEL_FLASH"}]',
 true,
 'ICS_SAFETY_v2',
 'v2',
 '{"tier": "SAFETY", "rationale": "Overspeed can cause catastrophic turbine blade failure. Auto-blocked.", "priority": 1}'),

-- ============================================================================
-- TIER 2: SECURITY RULES (Access Control & Authorization)
-- Priority: ALERT | Action: LOG + ALERT (no block unless combined with Tier 1)
-- Purpose: Detect unauthorized access attempts or command sources
-- Note: Only fires if the write is NOT already blocked by Tier 1 rules
-- ============================================================================

-- Rule 2A: Unauthorized Write Source Detection
('e4f6a8b1-c3d4-5e6f-7a8b-9c0d1e2f3a4b',
 'Security Alert: Unauthorized Write Source',
 'Setpoint modification from unauthorized source. Only EWS, TCS-HMI, and BOILER-HMI are authorized.',
 '{"component_types": ["DCS_Controller", "PLC", "Safety_PLC_ESD"]}',
 '{"event": "WRITE"}',
 '{"logic": "all", "clauses": [
   {"metric": "authz", "operator": "not_in", "value": ["EWS", "TCS-HMI", "BOILER-HMI"]},
   {"metric": "absolute", "operator": ">=", "value": 45},
   {"metric": "absolute", "operator": "<=", "value": 65}
 ]}',
 'alert',
 '[{"type": "LOG_AUDIT_EVENT"}, {"type": "ALERT_SECURITY_TEAM"}, {"type": "FLAG_FOR_INVESTIGATION"}]',
 true,
 'ICS_SECURITY_v2',
 'v2',
 '{"tier": "SECURITY", "rationale": "Detects unauthorized command sources. Only fires for non-safety-critical values to avoid duplicate alerts.", "priority": 2}'),

-- Rule 2B: After-Hours Engineering Activity
('f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c',
 'Security Alert: After-Hours Setpoint Change',
 'Engineering setpoint change detected outside normal operating hours (10pm-6am).',
 '{"component_types": ["DCS_Controller"]}',
 '{"event": "WRITE", "time_range": "22:00-06:00"}',
 '{"logic": "any", "clauses": [{"metric": "time_of_day", "operator": "outside", "value": "06:00-22:00"}]}',
 'alert',
 '[{"type": "LOG_AUDIT_EVENT"}, {"type": "ALERT_OPERATOR"}]',
 true,
 'ICS_SECURITY_v2',
 'v2',
 '{"tier": "SECURITY", "rationale": "Unusual timing may indicate insider threat or compromised credentials.", "priority": 2}'),

-- ============================================================================
-- TIER 3: OPERATIONAL ANOMALY RULES (Process Quality)
-- Priority: INFO | Action: LOG only
-- Purpose: Detect unusual operational patterns that may indicate issues
-- Note: Only logs for later analysis, does not alert operators
-- ============================================================================

-- Rule 3A: Rapid Setpoint Changes (Operational Quality)
('f5a7b8c2-d4e5-6f7a-8b9c-0d1e2f3a4b5c',
 'Operational Info: Rapid Drum Level Change',
 'Drum level setpoint changed rapidly (>5% in 10s). May indicate tuning issues or unusual operation.',
 '{"component_types": ["DCS_Controller"], "setpoint_names": ["Drum Level SP"]}',
 '{"event": "WRITE"}',
 '{"logic": "all", "clauses": [
   {"metric": "percent_change", "operator": ">", "value": 5, "window": "10s"},
   {"metric": "absolute", "operator": ">=", "value": 45},
   {"metric": "absolute", "operator": "<=", "value": 65}
 ]}',
 'info',
 '[{"type": "LOG_OPERATIONAL_EVENT"}]',
 true,
 'ICS_OPERATIONS_v2',
 'v2',
 '{"tier": "OPERATIONS", "rationale": "Tracks operational quality. Only logs to avoid alert fatigue. Excludes safety-critical ranges.", "priority": 3}'),

-- Rule 3B: Heater Temperature Advisory
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
 'Operational Info: High Pressure Heater Temp High',
 'HP heater temperature setpoint is high (>280°C). May affect efficiency.',
 '{"component_types": ["DCS_Controller"], "setpoint_names": ["HP Heater Temp SP"]}',
 '{"event": "WRITE"}',
 '{"logic": "any", "clauses": [{"metric": "absolute", "operator": ">", "value": 280}]}',
 'info',
 '[{"type": "LOG_OPERATIONAL_EVENT"}]',
 true,
 'ICS_OPERATIONS_v2',
 'v2',
 '{"tier": "OPERATIONS", "rationale": "Advisory only - not a safety issue but may impact efficiency.", "priority": 3}'),

-- ============================================================================
-- TIER 4: PROCESS DEVIATION RULES (Advanced Detection)
-- Priority: ALERT | Action: ALERT
-- Purpose: Detect sequences of changes that indicate coordinated attack
-- ============================================================================

-- Rule 4A: Multiple Critical Components Targeted
('g8h9i0j1-k2l3-4m5n-6o7p-8q9r0s1t2u3v',
 'Security Alert: Multiple Controller Attack Pattern',
 'Multiple DCS controllers modified within 60 seconds. Possible coordinated attack.',
 '{"component_types": ["DCS_Controller"]}',
 '{"event": "WRITE"}',
 '{"logic": "any", "clauses": [{"metric": "multi_target", "operator": "count", "value": 3, "window": "60s"}]}',
 'alert',
 '[{"type": "ALERT_SECURITY_TEAM"}, {"type": "LOG_AUDIT_EVENT"}, {"type": "ISOLATE_NETWORK_SEGMENT"}]',
 false,
 'ICS_SECURITY_v2',
 'v2',
 '{"tier": "SECURITY", "rationale": "Advanced: Detects coordinated attacks across multiple systems. Requires window tracking.", "priority": 2, "implementation_status": "future"}');

-- ============================================================================
-- RULE HIERARCHY SUMMARY
-- ============================================================================
-- Tier 1 (CRITICAL): Auto-blocks dangerous values (>65%, <45%, >3150 RPM)
-- Tier 2 (ALERT):    Security violations (wrong source, wrong time)
--                    BUT excludes safety-critical ranges to avoid duplicates
-- Tier 3 (INFO):     Operational quality (logs only, no alerts)
--                    Excludes safety-critical ranges
-- Tier 4 (ALERT):    Advanced patterns (future implementation)

-- ============================================================================
-- MITIGATION PLAYBOOKS (Updated)
-- ============================================================================

TRUNCATE TABLE mitigations RESTART IDENTITY CASCADE;

INSERT INTO mitigations (id, name, applies_to, steps, severity_scope, version, metadata) VALUES

-- Playbook 1: Safety Interlock Response
('0a9c1f2e-3d4b-45a6-9f0b-12c34d56e789',
 'Playbook: Safety Interlock Triggered',
 '{"rule_ids": ["b1a9b8e0-3c7f-4b1e-8e3b-9e4a3a3d2c1d", "c2d4e8f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f", "d3e5f8a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a"]}',
 '[
   {"order": 1, "action": "CONFIRM_WRITE_BLOCKED", "operator_notes": "Verify the dangerous setpoint write was automatically blocked by the safety system."},
   {"order": 2, "action": "VERIFY_CURRENT_STATE", "operator_notes": "Check current sensor readings to confirm process is still within safe operating limits."},
   {"order": 3, "action": "INVESTIGATE_SOURCE", "operator_notes": "Identify WHO attempted the unsafe change and WHY. Check if it was human error or system fault."},
   {"order": 4, "action": "DOCUMENT_INCIDENT", "operator_notes": "Create safety incident report. If malicious, escalate to security team immediately."}
 ]',
 '["critical"]',
 'v2',
 '{"notes": "Safety interlocks prevent physical damage. Focus on understanding root cause."}'),

-- Playbook 2: Security Incident Response
('2c3d4e5f-6071-42b3-8c4d-5e6f708192ab',
 'Playbook: Unauthorized Access Attempt',
 '{"rule_ids": ["e4f6a8b1-c3d4-5e6f-7a8b-9c0d1e2f3a4b", "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c"]}',
 '[
   {"order": 1, "action": "IDENTIFY_SOURCE", "operator_notes": "Check audit logs for source IP, username, and workstation that made the unauthorized write."},
   {"order": 2, "action": "ASSESS_IMPACT", "operator_notes": "Was the write within safe operational limits? Did safety systems block it?"},
   {"order": 3, "action": "CONTACT_USER", "operator_notes": "If known user, verify intent immediately. May be training issue or compromised account."},
   {"order": 4, "action": "ESCALATE_IF_MALICIOUS", "operator_notes": "If unauthorized or account compromised, isolate source device and notify security team."},
   {"order": 5, "action": "REVIEW_ACCESS_CONTROLS", "operator_notes": "Audit firewall rules and user permissions to prevent recurrence."}
 ]',
 '["alert"]',
 'v2',
 '{"notes": "Security violations need investigation but may not require immediate process shutdown."}'),

-- Playbook 3: Operational Review
('3d4e5f60-7182-43c4-9d5e-6f70819223bc',
 'Playbook: Operational Quality Review',
 '{"rule_ids": ["f5a7b8c2-d4e5-6f7a-8b9c-0d1e2f3a4b5c", "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"]}',
 '[
   {"order": 1, "action": "REVIEW_LOGS", "operator_notes": "Review operational logs weekly to identify patterns of rapid changes or high setpoints."},
   {"order": 2, "action": "OPTIMIZE_TUNING", "operator_notes": "If frequent rapid changes detected, consider PID loop retuning during next maintenance window."},
   {"order": 3, "action": "TRAINING_REVIEW", "operator_notes": "If operators frequently setting high/unusual setpoints, may indicate need for additional training."}
 ]',
 '["info"]',
 'v2',
 '{"notes": "These are quality indicators, not immediate threats. Review periodically for trends."}'
);

-- ============================================================================
-- IMPLEMENTATION NOTES
-- ============================================================================
-- 1. Tier 1 rules BLOCK writes automatically - highest priority
-- 2. Tier 2 rules have conditions that EXCLUDE Tier 1 ranges to prevent duplicates
-- 3. Tier 3 rules are INFO only - they log but don't alert
-- 4. Each rule now has ONE clear purpose
-- 5. Rule metadata includes "tier" field for easy filtering
-- 
-- Result: No more duplicate alerts for the same attack scenario!
