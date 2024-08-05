module GenieServer

using Genie
using Genie.Router
using Genie.Renderer.Json
import Genie.Exceptions as GE


include("engine.jl")  # Make sure this file contains the run_MMCACovid19Vac function

# Define the route for running the simulation
route("/run_simulation", method=POST) do
    # Parse the JSON payload
    payload = Genie.Requests.jsonpayload()

    # Extract necessary parameters from the payload
    config = payload["config"]
    data_path = payload["data_path"]
    instance_path = payload["instance_path"]
    init_condition_path = payload["init_condition_path"]

    # Run the simulation
    try
        result = run_MMCACovid19Vac(config, data_path, instance_path, init_condition_path)
        @info "Simulation completed successfully"
        return json(Dict("status" => "success", "message" => "Simulation completed successfully", "result" => result), status=200)
    catch e
        @error e
        throw(GE.InternalServerException("Simulation failed", string(e), 500))
    end
end


function run()
    Genie.up(async=true)
end

end