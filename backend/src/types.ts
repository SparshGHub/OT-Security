// This file will hold the shared TypeScript types for the backend.

export interface Component {
    id: string;
    process_id: string;
    name: string;
    type: string;
    network_zone: string;
    ip?: string;
    criticality: 'low' | 'medium' | 'high' | 'critical';
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
