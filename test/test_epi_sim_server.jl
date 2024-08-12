using Test
using HTTP
using JSON
using Base64
using DataFrames
using CSV
using NetCDF
using NCDatasets
using Dates

include("../src/epi_sim_server.jl")

import .EpiSimServer as ES

# ES.run()

# # Give the server a moment to start up
# sleep(5)

function read_mobility_reduction(fn::AbstractString)
    # max value for time is 455 so we're ok with Int16
    return CSV.read(fn, DataFrame, types=Dict(:date=>Date, :reduction=>Float64, :datetime=>Date, :time=>Int16))
end

@testset "EpiSim Server Tests" begin
    @test begin
        config = read("models/mitma/config.json", String)
        init_conditions_path = "models/mitma/initial_conditions.nc"
        compressed_data = Base64.base64encode(open(read, init_conditions_path))
        mobility_matrix = CSV.read("models/mitma/R_mobility_matrix.csv", DataFrame)
        metapop = CSV.read("models/mitma/metapopulation_data.csv", DataFrame)
        mobility_reduction = read_mobility_reduction("models/mitma/kappa0_from_mitma.csv")

        response = HTTP.post("http://localhost:8000/run_simulation", 
            ["Content-Type" => "application/json"],
            JSON.json(Dict(
                "engine" => "MMCACovid19Vac",
                "config" => config,
                "init_conditions" => compressed_data,
                "mobility_matrix" => JSON.json(mobility_matrix),
                "mobility_reduction" => JSON.json(mobility_reduction),
                "metapop" => JSON.json(metapop),
                "start_date" => "2023-04-01",
                "end_date" => "2023-03-20"
            ))
        )

        @debug response
        response.status == 200
    end
end