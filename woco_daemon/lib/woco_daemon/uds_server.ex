defmodule WocoDaemon.UdsServer do
  @moduledoc """
  Listens for client connections over a Unix Domain Socket.
  Each client connection is handled in its own process so the acceptor
  never blocks and multiple clients can be served concurrently.
  """
  use GenServer
  require Logger

  @socket_path "/tmp/woco_daemon.sock"

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Returns the configured socket path."
  def socket_path, do: @socket_path

  @impl true
  def init(_opts) do
    # Cleanup old socket
    File.rm(@socket_path)

    # Open listener
    case :gen_tcp.listen(0, [
           :binary,
           {:packet, 0},
           {:active, true},
           {:ifaddr, {:local, @socket_path}}
         ]) do
      {:ok, listen_socket} ->
        Logger.info("[UdsServer] Listening on #{@socket_path}")
        # Start async acceptor loop
        send(self(), :accept)
        {:ok, %{listen_socket: listen_socket, clients: %{}}}

      {:error, reason} ->
        Logger.error("[UdsServer] Failed to listen on #{@socket_path}: #{inspect(reason)}")
        {:stop, reason}
    end
  end

  @impl true
  def handle_info(:accept, state) do
    # Spawn a Task that blocks on accept, then transfers socket ownership
    # to this GenServer before returning the result.
    parent = self()
    listen_socket = state.listen_socket

    Task.start(fn ->
      case :gen_tcp.accept(listen_socket) do
        {:ok, client_socket} ->
          # Transfer socket ownership to the GenServer process
          # so it receives :tcp / :tcp_closed / :tcp_error messages
          case :gen_tcp.controlling_process(client_socket, parent) do
            :ok ->
              send(parent, {:client_connected, client_socket})
            {:error, reason} ->
              Logger.error("[UdsServer] controlling_process failed: #{inspect(reason)}")
              :gen_tcp.close(client_socket)
              send(parent, {:accept_error, reason})
          end
        {:error, reason} ->
          send(parent, {:accept_error, reason})
      end
    end)

    {:noreply, state}
  end

  @impl true
  def handle_info({:client_connected, client_socket}, state) do
    client_id = ref_to_id(client_socket)
    Logger.info("[UdsServer] Client connected: #{client_id}")

    WocoDaemon.InactivityMonitor.client_connected(client_id)

    new_clients = Map.put(state.clients, client_id, client_socket)

    # Accept the next connection
    send(self(), :accept)

    {:noreply, %{state | clients: new_clients}}
  end

  @impl true
  def handle_info({:accept_error, reason}, state) do
    Logger.error("[UdsServer] Accept failed: #{inspect(reason)}")
    Process.send_after(self(), :accept, 1000)
    {:noreply, state}
  end

  # Handle data from clients — :active true means messages arrive here
  @impl true
  def handle_info({:tcp, socket, data}, state) do
    client_id = ref_to_id(socket)
    Logger.debug("[UdsServer] Received from #{client_id}: #{inspect(data)}")

    trimmed = String.trim(data)

    case trimmed do
      "PING" ->
        WocoDaemon.InactivityMonitor.ping()
        :gen_tcp.send(socket, "PONG\n")
        :ok

      "STATUS" ->
        client_count = map_size(state.clients)
        :gen_tcp.send(socket, "OK clients=#{client_count}\n")
        :ok

      "SHUTDOWN" ->
        Logger.warning("[UdsServer] Shutdown command received")
        :gen_tcp.send(socket, "SHUTTING_DOWN\n")
        System.stop(0)

      _ ->
        Logger.debug("[UdsServer] Unknown command: #{trimmed}")
        :gen_tcp.send(socket, "ERROR unknown_command\n")
        :ok
    end

    {:noreply, state}
  end

  @impl true
  def handle_info({:tcp_closed, socket}, state) do
    client_id = ref_to_id(socket)
    Logger.info("[UdsServer] Client disconnected: #{client_id}")

    WocoDaemon.InactivityMonitor.client_disconnected(client_id)

    new_clients = Map.delete(state.clients, client_id)
    {:noreply, %{state | clients: new_clients}}
  end

  @impl true
  def handle_info({:tcp_error, socket, reason}, state) do
    client_id = ref_to_id(socket)
    Logger.warning("[UdsServer] TCP error from #{client_id}: #{inspect(reason)}")

    WocoDaemon.InactivityMonitor.client_disconnected(client_id)

    new_clients = Map.delete(state.clients, client_id)
    {:noreply, %{state | clients: new_clients}}
  end

  # Convert a socket reference to a stable string ID
  defp ref_to_id(socket) when is_port(socket) do
    inspect(socket)
  end
end
