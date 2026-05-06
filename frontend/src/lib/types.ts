export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface Process {
    id: string;
    name: string;
    sequence: number;
    description: string;
}

export interface Component {
    id: string;
    process_id: string;
    name: string;
    type: string;
    network_zone: string;
    ip?: string | null;
    criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface Setpoint {
    id: string;
    component_id: string;
    name: string;
    value: string;
    units: string;
    min: number | null;
    max: number | null;
}

export interface Connectivity {
    id : string;
    from_component_id: string;
    to_component_id: string;
    protocol: string;
    direction: 'uni' | 'bi';
}

export interface PlantTopology {
    processes: Process[];
    components: Component[];
    setpoints: Setpoint[];
    connectivity: Connectivity[];
}

export interface Rule {
    id: string;
    name: string;
    description: string;
    applies_to: {
        component_types: string[];
    };
    trigger: {
        event: string;
    };
    conditions: {
        logic: 'all' | 'any';
        clauses: any[];
    };
    severity: 'info' | 'alert' | 'critical';
    enabled: boolean;
}

export interface Mitigation {
    id: string;
    name: string;
    applies_to: {
        rule_ids: string[];
    };
    steps: MitigationStep[];
}

export interface MitigationStep {
    order: number;
    action: string;
    operator_notes: string;
}

export interface SimulationEvent {
    id: string;
    attack_id: string;
    component_id: string;
    rule_id: string | null;
    type: string;
    payload: {
        message: string;
    };
    severity: 'info' | 'alert' | 'critical';
    is_mitigated?: boolean;
    timestamp: string; // ISO 8601
}

export interface SimulationParams {
    component_id: string;
    attack_type: string;
    params: any;
}

export interface SimulationResult {
    attack_id: string;
    events: SimulationEvent[];
    rules_fired: Rule[];
    mitigations: Mitigation[];
}

