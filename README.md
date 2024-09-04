
# EpiSimServer

EpiSimServer is a Flask-based web interface for running and managing epidemic simulations using the EpiSim backend. This project provides a user-friendly interface to configure, run, and visualize epidemic simulations.

### Features
* Web Interface: User-friendly web interface built with Flask and Dash.
* Simulation Management: Upload, run, and manage simulation configurations and results.
* Visualization: Interactive plots and maps to visualize simulation results.
* Database Integration: Store and retrieve simulation parameters and results using SQLite.

### Installation

#### Prerequisites

* Python 3.8+
* Node.js (for building frontend assets)

#### Steps

Clone the repository:

```bash
git clone https://github.com/yourusername/EpiSimServer.git
```

Install Python dependencies:
Note: this includes EpiSim. When you install the python interface to EpiSim, it will compile the Julia backend. This takes a very long time (like 10 minutes), and the resulting compiled engine is large (like 2GB).


```bash
pip install -vv -r requirements.txt
```

Install Node.js dependencies:

```bash
npm install
```

Build frontend assets:

```bash
npm run build
```

### Usage

#### Running the Server

To start the Flask server, run:

```bash
python src/epi_sim_server.py
```

The server will be available at http://127.0.0.1:5000.

#### Endpoints

* Home: / - Main landing page.
* Setup: /setup - Page to set up a new simulation.
* Engine Options: /engine_options - API endpoint to fetch available simulation engines.
* Check File Exists: /check_file_exists - API endpoint to check if a simulation file already exists.
* Upload Simulation: /upload_simulation - API endpoint to upload a simulation file.
* Run Simulation: /run_simulation - API endpoint to run a new simulation.

#### Configuration
Simulation configurations are managed through JSON files. An example configuration file can be found at models/mitma/config.json.

#### Visualization

Simulation results can be visualized through the Dash interface available at /dash/results/<simulation_id>.

#### Project Structure

* src/epi_sim_server.py: Main Flask application and API endpoints.
* src/db/db.py: Database functions for storing and retrieving simulation data.
* src/js: Frontend React components and assets.
* src/html: HTML templates for rendering pages.