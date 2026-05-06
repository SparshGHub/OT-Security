// Frontend copy of attack constants to drive simulation UI options
export const COMPONENT_TO_ATTACKS: Record<string, string[]> = {
  sensor: ['False Data Injection', 'Spoofing', 'Signal Jamming', 'Denial of Service', 'Physical Tampering'],
  actuator: ['Unauthorized Command', 'Physical Tampering', 'Denial of Service', 'Command Injection', 'Replay Attack'],
  plc: ['Logic Modification', 'Firmware Exploit', 'Replay Attack', 'Denial of Service', 'Memory Manipulation', 'Unauthorized Access'],
  dcs_controller: ['Service Overload', 'Unauthorized Access', 'Buffer Overflow', 'Denial of Service', 'Configuration Tampering', 'Command Injection'],
  historian: ['SQL Injection', 'Data Exfiltration', 'Ransomware', 'Denial of Service', 'Privilege Escalation', 'Data Tampering'],
  workstation: ['Malware Injection', 'Credential Theft', 'Remote Desktop Takeover', 'Denial of Service', 'Phishing', 'Keylogging', 'Privilege Escalation'],
  hmi: ['Display Manipulation', 'Credential Theft', 'Unauthorized Command', 'Denial of Service', 'Screen Overlay Attack'],
};

export const ATTACK_TO_SOURCES: Record<string, string[]> = {
  'SQL Injection': ['HISTORIAN', 'EWS', 'REMOTE_ACCESS_VPN', 'CORPORATE_NETWORK'],
  'Logic Modification': ['EWS', 'LOCAL_MAINTENANCE_LAPTOP'],
  'Physical Tampering': ['PHYSICAL_ACCESS', 'LOCAL_MAINTENANCE_LAPTOP'],
  'False Data Injection': ['EWS', 'HMI', 'LOCAL_MAINTENANCE_LAPTOP', 'IIOT_GATEWAY', 'PHYSICAL_ACCESS'],
  'Denial of Service': ['REMOTE_ACCESS_VPN', 'CORPORATE_NETWORK', 'HISTORIAN', 'EWS', 'HMI', 'PHYSICAL_USB', 'LOCAL_MAINTENANCE_LAPTOP', 'IIOT_GATEWAY'],
  'Firmware Exploit': ['EWS', 'LOCAL_MAINTENANCE_LAPTOP', 'PHYSICAL_USB'],
  'Unauthorized Command': ['HMI', 'EWS', 'LOCAL_MAINTENANCE_LAPTOP', 'REMOTE_ACCESS_VPN'],
  'Malware Injection': ['PHYSICAL_USB', 'REMOTE_ACCESS_VPN', 'CORPORATE_NETWORK', 'LOCAL_MAINTENANCE_LAPTOP'],
  'Spoofing': ['HMI', 'EWS', 'LOCAL_MAINTENANCE_LAPTOP', 'IIOT_GATEWAY'],
  'Signal Jamming': ['PHYSICAL_ACCESS', 'LOCAL_MAINTENANCE_LAPTOP', 'IIOT_GATEWAY'],
  'Command Injection': ['EWS', 'HMI', 'LOCAL_MAINTENANCE_LAPTOP', 'REMOTE_ACCESS_VPN'],
  'Replay Attack': ['EWS', 'HMI', 'LOCAL_MAINTENANCE_LAPTOP', 'IIOT_GATEWAY'],
  'Memory Manipulation': ['EWS', 'LOCAL_MAINTENANCE_LAPTOP'],
  'Unauthorized Access': ['REMOTE_ACCESS_VPN', 'CORPORATE_NETWORK', 'EWS'],
  'Service Overload': ['REMOTE_ACCESS_VPN', 'CORPORATE_NETWORK', 'EWS', 'HMI'],
  'Buffer Overflow': ['EWS', 'LOCAL_MAINTENANCE_LAPTOP', 'REMOTE_ACCESS_VPN'],
  'Configuration Tampering': ['EWS', 'LOCAL_MAINTENANCE_LAPTOP', 'PHYSICAL_ACCESS'],
  'Data Exfiltration': ['HISTORIAN', 'CORPORATE_NETWORK', 'REMOTE_ACCESS_VPN'],
  'Ransomware': ['PHYSICAL_USB', 'REMOTE_ACCESS_VPN', 'CORPORATE_NETWORK'],
  'Privilege Escalation': ['EWS', 'CORPORATE_NETWORK'],
  'Data Tampering': ['HISTORIAN', 'EWS', 'LOCAL_MAINTENANCE_LAPTOP'],
  'Credential Theft': ['HMI', 'EWS', 'CORPORATE_NETWORK'],
  'Remote Desktop Takeover': ['REMOTE_ACCESS_VPN', 'CORPORATE_NETWORK'],
  'Phishing': ['CORPORATE_NETWORK'],
  'Keylogging': ['PHYSICAL_USB', 'CORPORATE_NETWORK', 'EWS'],
  'Display Manipulation': ['HMI', 'EWS'],
  'Screen Overlay Attack': ['HMI']
};

export default {
  COMPONENT_TO_ATTACKS,
  ATTACK_TO_SOURCES,
};
