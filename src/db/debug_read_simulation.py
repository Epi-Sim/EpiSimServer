import sys
from db import read_simulation

def debug_simulation(simulation_id):
    try:
        ds = read_simulation(simulation_id)
        if ds is None:
            print(f"No data found for simulation ID: {simulation_id}")
        else:
            print(f"Data for simulation ID {simulation_id}:")
            print(ds)  # Print the dataset or its summary
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python debug_simulation.py <simulation_id>")
        sys.exit(1)

    simulation_id = sys.argv[1]
    debug_simulation(simulation_id)