# Thermal Power Plant DCS Tabletop Attack Simulator

This project is a tabletop cyber-attack simulator for a Distributed Control System (DCS) in a thermal power plant. It provides a visual representation of the plant's network topology and allows users to simulate attacks to understand potential event chains, rule triggers, and mitigation strategies.

The entire application is designed to run locally using Docker and Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## 1. Setup

First, create a `.env` file in the root directory. You can copy the example file if it exists, or create a new `.env` file with the following required variables:

```bash
# Ports mapping
FRONTEND_PORT=3000
BACKEND_PORT=4000

# Database Configuration
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=dcsdb

# Backend Security
JWT_SECRET=super_secret_jwt_key_change_me
```

Review the `.env` file and make sure to change the `JWT_SECRET` and `DB_PASSWORD` in a production environment. The default values provided are configured to work seamlessly with Docker Compose out of the box.

## 2. Running the Application with Docker Compose

This is the recommended way to run the application. From the root directory of the project, run the following command:

```bash
docker-compose up --build
```

This command will:
1.  Build the Docker images for the `frontend` and `backend` services.
2.  Start the `postgres` database container.
3.  The database will be automatically initialized using the scripts in the `sql/` directory.
4.  Start the `backend` service, which automatically waits for the database to be ready.
5.  Start the `frontend` service.

Once all services are up and running:
- The **Frontend** will be available at [http://localhost:3000](http://localhost:3000)
- The **Backend API** will be available at [http://localhost:4000](http://localhost:4000)

## 3. How to Use the Simulator

1.  **Open the UI:** Navigate to [http://localhost:3000](http://localhost:3000) in your browser.
2.  **Explore the Plant:** The main view shows a map of the thermal power plant's processes. You can click on a process to see the components within it.
3.  **Select a Component:** Click on a component node (e.g., a Controller, Sensor, or HMI) in the diagram.
4.  **Simulate an Attack:**
    - The right-hand panel will show details about the selected component.
    - Choose an "Attack Type" from the dropdown menu (e.g., `setpoint_change`).
    - Fill in any required parameters for the attack.
    - Click the "Simulate Attack" button.
5.  **Review the Results:**
    - The nodes on the map affected by the simulation will be highlighted.
    - The bottom panel will display a timeline of events that occurred as a result of the attack, including which security rules were triggered.
    - You can click on a triggered rule to view the recommended mitigation playbook in a modal window.

## Project Structure

- `backend/`: The Node.js (Express) API server.
- `frontend/`: The React (Next.js) web application.
- `sql/`: Contains the PostgreSQL database schema and seed data.
- `topology/`: JSON schema and instance data for the plant's DCS topology.
- `rules/`: JSON schema and the auto-generated library of detection rules.
- `mitigations/`: JSON schema and the auto-generated library of mitigation playbooks.
- `docker-compose.yml`: Orchestrates all the services.
