defmodule WocoDaemonTest do
  use ExUnit.Case
  doctest WocoDaemon

  test "greets the world" do
    assert WocoDaemon.hello() == :world
  end
end
