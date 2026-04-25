# **App Name**: OT Shield

## Core Features:

- Alert Monitoring: Display real-time alerts received via WebSocket with severity, decision, resource, and reason.
- Alert History: Fetch and display a pageless table of recent alerts from the REST API.
- Simulation Controls: Provide UI controls (numeric inputs and dropdowns) to trigger Modbus write simulations.
- Setpoint Simulation: Allow users to simulate OT setpoint changes.
- Real-time Notifications: Receive and display real-time security alerts via WebSocket.
- System Health Monitoring: Track and display the WebSocket connection status, last alert time, and alert counts by decision.
- Event Generation Assistant: A tool that leverages generative AI to provide context-aware recommendations for values of simulated events that could indicate potential security breaches. This feature analyzes the current system state (as reflected by alerts and other data), as well as patterns of attack and typical setpoint configurations in a thermal power plant, to inform its recommendations.

## Style Guidelines:

- Primary color: Indigo (#4F46E5) to convey professionalism and trust.
- Background color: Dark slate (#1E293B), offering a high-contrast backdrop for data presentation.
- Accent color: Emerald green (#10B981), for highlighting interactive elements and positive status indicators.
- Body and headline font: 'Inter', a sans-serif font that delivers a modern and readable interface. Note: currently only Google Fonts are supported.
- Utilize generous spacing and rounded corners to create a clean and modern layout.
- Incorporate simple, clear icons to represent different alert types and system states.
- Employ subtle animations for state changes and data updates, enhancing user engagement without being distracting.