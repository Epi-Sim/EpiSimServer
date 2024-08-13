import os
import json
import subprocess

class MMCACovid19:
    def __init__(self, executable_path):
        # assert the compiled executable exists
        assert os.path.exists(executable_path)
        assert os.path.isfile(executable_path)
        assert os.access(executable_path, os.X_OK)

        self.executable_path = executable_path

    def run_model(self, config, data_folder, instance_folder, initial_conditions=None):
        """
        Run the compiled MMCACovid19Vac model.
        Provide your config as a dict or as a path to a json file.
        """

        assert os.path.exists(data_folder)
        assert os.path.exists(instance_folder)

        if isinstance(config, dict):
            config_path = os.path.join(instance_folder, 'config_auto_py.json')
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=4)
        else:
            assert os.path.exists(config)
            config_path = config

        cmd = [self.executable_path]
        # TODO: undo hardcoded engine
        cmd.extend(["-e", "MMCACovid19Vac", "run"])
        cmd.extend(["--config", config_path])
        cmd.extend(["--data-folder", data_folder])
        cmd.extend(["--instance-folder", instance_folder])
        
        if initial_conditions:
            cmd.extend(["--initial-condition", initial_conditions])

        print(f"Running command: {cmd}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"Model execution failed: {result.stderr}")
        
        return result.stdout

def pardir(): return os.path.join(os.path.dirname(__file__), "..")

def run_model_example():
    executable_path = os.path.join(pardir(), "episim")
    model = MMCACovid19(executable_path)

    # read the config file sample to dict
    with open(os.path.join(pardir(), "models/mitma/config.json"), 'r') as f:
        config = json.load(f)

    args = {
        "config": config,
        "data_folder": os.path.join(pardir(), "models/mitma"),
        "instance_folder": os.path.join(pardir(), "runs"),
    }

    print("Running")
    output = model.run_model(**args)
    print(output)
    print("Example done")

if __name__ == "__main__":
    run_model_example()