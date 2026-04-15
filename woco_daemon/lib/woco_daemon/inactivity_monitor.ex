defmodule WocoDaemon.InactivityMonitor do
  @moduledoc """
  Monitors inactivity and shuts down the VM after the configured timeout.
  
  Activity is defined as:
  - Any supervised wave process running
  - Any connected CLI/TUI client (indicated by heartbeats)
  
  Default timeout: 300,000ms (5 minutes).
  Can be disabled via configuration.
  """
  use GenServer
  require Logger

  @default_timeout 300_000

  # Client API

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Notifies the monitor that activity occurred."
  def ping() do
    GenServer.cast(__MODULE__, :ping)
  end

  @doc "Registers a client connection."
  def client_connected(client_id) do
    GenServer.call(__MODULE__, {:client_connected, client_id})
  end

  @doc "Unregisters a client connection."
  def client_disconnected(client_id) do
    GenServer.call(__MODULE__, {:client_disconnected, client_id})
  end

  # Server Callbacks

  @impl true
  def init(opts) do
    # Read from shared config (placeholder logic for now)
    enabled = Keyword.get(opts, :enabled, true)
    timeout = Keyword.get(opts, :timeout, @default_timeout)

    state = %{
      enabled: enabled,
      timeout: timeout,
      clients: MapSet.new(),
      timer: nil
    }

    if enabled do
      {:ok, reset_timer(state)}
    else
      Logger.info("[InactivityMonitor] Auto-shutdown is disabled.")
      {:ok, state}
    end
  end

  @impl true
  def handle_call({:client_connected, client_id}, _from, state) do
    Logger.debug("[InactivityMonitor] Client connected: #{client_id}")
    new_state = %{state | clients: MapSet.put(state.clients, client_id)}
    {:reply, :ok, reset_timer(new_state)}
  end

  @impl true
  def handle_call({:client_disconnected, client_id}, _from, state) do
    Logger.debug("[InactivityMonitor] Client disconnected: #{client_id}")
    new_state = %{state | clients: MapSet.delete(state.clients, client_id)}
    {:reply, :ok, reset_timer(new_state)}
  end

  @impl true
  def handle_cast(:ping, state) do
    {:noreply, reset_timer(state)}
  end

  @impl true
  def handle_info(:check_inactivity, state) do
    if MapSet.size(state.clients) == 0 do
      # TODO: Also check if any Waves are active before killing
      Logger.warning("[InactivityMonitor] Inactivity timeout reached. Shutting down daemon...")
      System.stop(0)
      {:noreply, state}
    else
      # Clients still connected, just reset the timer
      {:noreply, reset_timer(state)}
    end
  end

  # Internal

  defp reset_timer(state) do
    if state.timer, do: Process.cancel_timer(state.timer)

    if state.enabled do
      new_timer = Process.send_after(self(), :check_inactivity, state.timeout)
      %{state | timer: new_timer}
    else
      state
    end
  end
end
