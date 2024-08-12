module EpiSimServer

using Genie
using Genie.Router
using Genie.Renderer.Json: json
import Genie.Exceptions as GE
using CSV
import JSON
import Logging
using NCDatasets
using DataFrames
using MMCACovid19Vac: init_NPI_parameters_struct
using Base64
using Dates

include("engine.jl")

function read_mobility_reduction(json_dict::Dict)
    return DataFrame(
        date = Date.(json_dict["date"]),
        reduction = Float64.(json_dict["reduction"]),
        datetime = Date.(json_dict["datetime"]),
        time = Int.(json_dict["time"])
    )
end

# Define the route for running the simulation
route("/run_simulation", method=POST) do
    payload = Genie.Requests.jsonpayload()

    temp_file = tempname() * ".nc"
    try
        # Extract and decode file contents
        engine = payload["engine"]
        config = JSON.parse(payload["config"])

        # can't use IOBuffer here because it doesn't support seek
        decoded_data = Base64.base64decode(payload["init_conditions"])
        write(temp_file, decoded_data)
        init_condition = ncread(temp_file, "data")

        # assert that we have read the NCDataset correctly
        @assert !isnothing(init_condition) "Init condition is empty"
        @assert isa(init_condition, Array) "Init condition is not an Array"

        mobility_reduction = JSON.parse(payload["mobility_reduction"])
        mobility_reduction = read_mobility_reduction(mobility_reduction)

        @assert !isnothing(mobility_reduction) "Mobility reduction is empty"

        mobility_matrix = JSON.parse(payload["mobility_matrix"])
        # simulator code relies on the order of dataframe columns
        mobility_matrix = DataFrame(
            source_idx = Int.(mobility_matrix["source_idx"]),
            target_idx = Int.(mobility_matrix["target_idx"]),
            ratio = Float64.(mobility_matrix["ratio"])
        )

        metapop = JSON.parse(payload["metapop"])
        metapop = DataFrame(
            id = String.(metapop["id"]),
            area = Float64.(metapop["area"]),
            Y = Int.(metapop["Y"]),
            M = Int.(metapop["M"]),
            O = Int.(metapop["O"]),
            Total = Int.(metapop["Total"])
        )

        start_date = Date(payload["start_date"])

        npi_params = init_NPI_parameters_struct(mobility_reduction, get(config, "NPI", Dict()), start_date)

        engine = get_engine(engine)

        @debug "running engine"
        # return json(Dict("status" => "success", "message" => "pre-sim pass", "result" => Dict()), status=200)
        result = run_engine(engine, config, npi_params, mobility_matrix, metapop, init_condition)
        @info "Simulation completed successfully"
        return json(Dict("status" => "success", "message" => "Simulation completed successfully"), status=200)
    catch e
        if isa(e, MethodError)
            arg_types = [typeof(arg) for arg in e.args]
            truncated_args = length(arg_types) > 3 ? 
                "[$(join(arg_types[1:3], ", ")), ...]" : 
                "[$(join(arg_types, ", "))]"
            error_message = "MethodError: $(e.f) with argument types: $truncated_args"
            @error error_message exception=(e, catch_backtrace())
        else
            @error "error in run_simulation" exception=(e, catch_backtrace())
        end
        throw(GE.InternalServerException("Simulation failed", string(e)[1:500] * "...", 500))
    finally
        isfile(temp_file) && rm(temp_file)
    end
end


function run()
    Genie.up(async=false)
end

"Run in verbose mode"
function debug()
    ENV["GENIE_ENV"] = "dev"
    Genie.config.log_level = Logging.Debug
    Genie.config.log_to_file = false
    # Genie.config.server_handle_exceptions = false
    Genie.up(verbose=true, async=false)
end

end