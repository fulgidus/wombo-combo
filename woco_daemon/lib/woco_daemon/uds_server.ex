defmodule WocoDaemon.UdsServer do
  @moduledoc """
  Listens for client connections over a Unix Domain Socket.
  Dispatches incoming requests to the relevant GenServers.
  """
  use GenServer
  require Logger

  @socket_path "/tmp/woco_daemon.sock"

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    # Cleanup old socket
    File.rm(@socket_path)

    # Open listener
    case :gen_tcp.listen(0, [:binary, {:packet, 0}, {:active, true}, {:ifaddr, {:local, @socket_path}}]) do
      {:ok, listen_socket} ->
        Logger.info("[UdsServer] Listening on #{@socket_path}")
        {:ok, %{listen_socket: listen_socket}, {:continue, :accept}}

      {:error, reason} ->
        Logger.error("[UdsServer] Failed to listen on #{@socket_path}: #{inspect(reason)}")
        {:stop, reason}
    end
  end

  @impl true
  def handle_continue(:accept, state) do
    case :gen_tcp.accept(state.listen_socket) do
      {:ok, client_socket} ->
        # Spin up a worker to handle this specific client
        # In a real app, use a Task or a separate GenServer per conn
        WocoDaemon.InactivityMonitor.client_connected(inspect(client_socket))
        # Keep accepting
        send(self(), :accept_next)
        {:noreply, state}

      {:error, reason} ->
        Logger.error("[UdsServer] Accept failed: #{inspect(reason)}")
        {:noreply, state}
    end
  end

  @impl true
  def handle_info(:accept_next, state) do
    {:noreply, state, {:continue, :accept}}
  end

  # Handle data from clients
  @impl true
  def handle_info({:tcp, socket, data}, state) do
    Logger.debug("[UdsServer] Received: #{data}")
    # Primitive heartbeat logic
    if String.trim(data) == "PING" do
      WocoDaemon.InactivityMonitor.ping()
      :gen_tcp.send(socket, "PONG\n")
    end
    {:noreply, state}
  end

  @impl true
  def handle_info({:tcp_closed, socket}, state) do
    Logger.debug("[UdsServer] Client closed connection")
    WocoDaemon.InactivityMonitor.client_disconnected(inspect(socket))
    {:noreply, state}
  end
end
