using Test
using HTTP
using JSON

include("../src/genie_server.jl")

import .GenieServer as GS

GS.run()

# Give the server a moment to start up
sleep(5)

@testset "Genie Server Tests" begin
    @test begin
        response = HTTP.post("http://localhost:8000/run_simulation", 
            ["Content-Type" => "application/json"],
            JSON.json(Dict(
                "config" => JSON.parsefile("models/mitma/config.json"),
                "data_path" => "models/mitma",
                "instance_path" => "runs",
                "init_condition_path" => "models/mitma/initial_conditions.nc"
            ))
        )
        println(response)
        response.status == 200
    end
end
