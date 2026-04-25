-- Main schema for the Thermal Power Plant DCS Simulator

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sequence INT NOT NULL,
    description TEXT
);
CREATE INDEX idx_processes_sequence ON processes(sequence);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('engineer', 'operator', 'manager', 'admin')),
    password_hash TEXT NOT NULL,
    metadata JSONB
);

CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    network_zone TEXT NOT NULL CHECK (network_zone IN ('Field', 'Control', 'DMZ', 'Enterprise')),
    ip TEXT,
    criticality TEXT NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    capabilities JSONB,
    attack_surface JSONB,
    metadata JSONB,
    redundant BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_components_process_id ON components(process_id);
CREATE INDEX idx_components_type ON components(type);

CREATE TABLE setpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component_id UUID REFERENCES components(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value TEXT,
    units TEXT,
    min FLOAT,
    max FLOAT,
    roc_limit FLOAT,
    deadband FLOAT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_setpoints_component_id ON setpoints(component_id);

CREATE TABLE connectivity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_component UUID REFERENCES components(id) ON DELETE CASCADE,
    to_component UUID REFERENCES components(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('uni', 'bi')),
    metadata JSONB
);
CREATE INDEX idx_connectivity_from_component ON connectivity(from_component);
CREATE INDEX idx_connectivity_to_component ON connectivity(to_component);

CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    applies_to JSONB,
    trigger JSONB,
    conditions JSONB,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'alert', 'critical')),
    actions JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    source TEXT,
    version TEXT,
    metadata JSONB
);

CREATE TABLE mitigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    applies_to JSONB,
    steps JSONB,
    severity_scope JSONB,
    regulatory_refs JSONB,
    version TEXT,
    metadata JSONB
);

CREATE TABLE attacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component_id UUID REFERENCES components(id),
    attack_type TEXT NOT NULL,
    params JSONB,
    initiated_by UUID REFERENCES users(id),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_attacks_component_id ON attacks(component_id);
CREATE INDEX idx_attacks_timestamp ON attacks(timestamp);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attack_id UUID REFERENCES attacks(id),
    component_id UUID REFERENCES components(id),
    rule_id UUID REFERENCES rules(id),
    type TEXT NOT NULL,
    payload JSONB,
    severity TEXT NOT NULL,
    is_mitigated BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_events_attack_id ON events(attack_id);
CREATE INDEX idx_events_timestamp_severity ON events(timestamp, severity);

-- Seed users with a known-good bcrypt hash for password "password"
-- Hash: $2a$10$kzBjoUj9VAW1PdVDGe7ILOht3bA/xN4JcuEfeWioEBjdklSfv0N5O
INSERT INTO users (id, name, email, role, password_hash, metadata) VALUES
('a3b5c7d9-e1f3-4a6b-8c7d-9e1f3a6b8c7d', 'Test Engineer', 'engineer@example.com', 'engineer',
 '$2a$10$kzBjoUj9VAW1PdVDGe7ILOht3bA/xN4JcuEfeWioEBjdklSfv0N5O',
 '{"notes":"Default engineer user for API testing and simulation."}'),
('b7b8b9ba-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Plant Operator', 'operator@example.com', 'operator',
 '$2a$10$kzBjoUj9VAW1PdVDGe7ILOht3bA/xN4JcuEfeWioEBjdklSfv0N5O',
 '{"notes":"Default operator user for UI login."}');

