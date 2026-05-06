-- This file seeds the plant's DCS topology using valid UUIDs.
-- Must run after schema.sql has created tables and uuid extension.

-- Clear existing data
TRUNCATE TABLE connectivity RESTART IDENTITY CASCADE;
TRUNCATE TABLE setpoints RESTART IDENTITY CASCADE;
TRUNCATE TABLE components RESTART IDENTITY CASCADE;
TRUNCATE TABLE processes RESTART IDENTITY CASCADE;

DO $$
DECLARE
  -- Process IDs
  coal_process_id     UUID := uuid_generate_v4();
  boiler_process_id   UUID := uuid_generate_v4();
  turbine_process_id  UUID := uuid_generate_v4();
  condenser_process_id UUID := uuid_generate_v4();
  feedwater_process_id UUID := uuid_generate_v4();

  -- Component IDs
  boiler_controller_id  UUID := uuid_generate_v4();
  turbine_controller_id UUID := uuid_generate_v4();
  boiler_hmi_id         UUID := uuid_generate_v4();
  turbine_hmi_id        UUID := uuid_generate_v4();
  ews_id                UUID := uuid_generate_v4();
  historian_id          UUID := uuid_generate_v4();
  drum_sensor_id        UUID := uuid_generate_v4();
  load_sensor_id        UUID := uuid_generate_v4();
BEGIN
  -- Insert Processes
  INSERT INTO processes (id, name, sequence, description) VALUES
    (coal_process_id,     'Coal Handling',        1, 'Prepares and delivers coal to the boiler.'),
    (boiler_process_id,   'Boiler',               2, 'Generates high-pressure steam by burning fuel.'),
    (turbine_process_id,  'Steam Turbine',        3, 'Converts steam energy into mechanical rotation.'),
    (condenser_process_id,'Condenser & Cooling',  4, 'Cools steam back into water.'),
    (feedwater_process_id,'Feedwater System',     5, 'Pumps water back to the boiler.');

  -- Boiler Process Components
  INSERT INTO components (id, process_id, name, type, network_zone, ip, criticality) VALUES
    (boiler_controller_id, boiler_process_id, 'Boiler Control PLC', 'DCS_Controller', 'Control', '192.168.1.10', 'critical'),
    (drum_sensor_id,       boiler_process_id, 'Drum Level Sensor',  'Field_Device_Sensor', 'Field', '192.168.2.10', 'critical');

  -- Turbine Process Components
  INSERT INTO components (id, process_id, name, type, network_zone, ip, criticality) VALUES
    (turbine_controller_id, turbine_process_id, 'Turbine Control PLC', 'DCS_Controller', 'Control', '192.168.1.11', 'critical'),
    (load_sensor_id,        turbine_process_id, 'Turbine Load Sensor',  'Field_Device_Sensor', 'Field', '192.168.2.11', 'high');

  -- Shared / Enterprise Components
  INSERT INTO components (id, process_id, name, type, network_zone, ip, criticality) VALUES
    (boiler_hmi_id,  boiler_process_id, 'BOILER-HMI', 'Operator_HMI', 'Control', '192.168.1.100', 'high'),
    (turbine_hmi_id, turbine_process_id,'TCS-HMI',    'Operator_HMI', 'Control', '192.168.1.101', 'high'),
    (ews_id,         NULL,              'Engineering Workstation', 'Engineering_Station', 'Enterprise', '10.10.10.5', 'medium'),
    (historian_id,   NULL,              'Plant Historian',         'Historian',           'Enterprise', '10.10.10.20','medium');

  -- Setpoints for Boiler Controller
  INSERT INTO setpoints (component_id, name, value, units, min, max) VALUES
    (boiler_controller_id, 'Drum Level SP', '56.0', '%', 40, 70);

  -- Setpoints for Turbine Controller
  INSERT INTO setpoints (component_id, name, value, units, min, max) VALUES
    (turbine_controller_id, 'Turbine Load SP', '215.0', 'MW', 0, 250);

  -- Connectivity
  -- Sensors to Controllers
  INSERT INTO connectivity (from_component, to_component, protocol, direction) VALUES
    (drum_sensor_id,    boiler_controller_id,  'Profinet', 'uni'),
    (load_sensor_id,    turbine_controller_id, 'Profinet', 'uni');

  -- Controllers to HMIs
  INSERT INTO connectivity (from_component, to_component, protocol, direction) VALUES
    (boiler_controller_id,  boiler_hmi_id,  'OPC-UA', 'bi'),
    (turbine_controller_id, turbine_hmi_id, 'OPC-UA', 'bi');

  -- EWS to Controllers (for engineering)
  INSERT INTO connectivity (from_component, to_component, protocol, direction) VALUES
    (ews_id, boiler_controller_id,   'EtherNet/IP', 'bi'),
    (ews_id, turbine_controller_id,  'EtherNet/IP', 'bi');

  -- Controllers to Historian
  INSERT INTO connectivity (from_component, to_component, protocol, direction) VALUES
    (boiler_controller_id,  historian_id, 'OPC-UA', 'uni'),
    (turbine_controller_id, historian_id, 'OPC-UA', 'uni');
END $$;

