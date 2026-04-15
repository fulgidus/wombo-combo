defmodule WocoDaemon.Application do
  @moduledoc false
  use Application
  require Logger

  @impl true
  def start(_type, _args) do
    Logger.info("[Application] Starting Wombo-Combo BEAM Daemon...")

    children = [
      {WocoDaemon.InactivityMonitor, timeout: 300_000},
      WocoDaemon.UdsServer,
      {DynamicSupervisor, name: WocoDaemon.WaveSupervisor, strategy: :one_for_one}
    ]

    # Explicitly check for UI settings to disable auto-shutdown if needed
    # (Mocking config loading for now)
    
    opts = [strategy: :one_for_one, name: WocoDaemon.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
