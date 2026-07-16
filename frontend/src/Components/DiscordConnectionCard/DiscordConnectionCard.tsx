import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import type { DiscordConnection } from "../../types";
import "./DiscordConnectionCard.css";

export function DiscordConnectionCard() {
  const [searchParams] = useSearchParams();
  const [connection, setConnection] = useState<DiscordConnection>({ connected: false });
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(searchParams.get("discord_error") || "");
  const connectedMessage = searchParams.get("discord") === "connected" ? "Discord account connected successfully." : "";

  const load = async () => {
    try {
      const result = await api.discordConnection();
      setConfigured(result.configured);
      setConnection(result.connection);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Discord connection could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const connect = async () => {
    setBusy("connect");
    setError("");
    try {
      const result = await api.startDiscordConnect();
      window.location.assign(result.authorizationUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Discord authorization could not be started.");
      setBusy("");
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    setError("");
    try {
      await api.disconnectDiscord();
      setConnection({ connected: false });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Discord could not be disconnected.");
    } finally {
      setBusy("");
    }
  };

  return <div className="discord-connection-card">
    <div className="discord-mark" aria-hidden="true">D</div>
    <div className="discord-connection-copy">
      <strong>Discord</strong>
      {loading && <span>Checking connection...</span>}
      {!loading && connection.connected && <><span>Connected as {connection.displayName || connection.username}</span><small>{connection.email || `Discord ID ${connection.id}`}</small></>}
      {!loading && !connection.connected && <span>Link your Discord account to this signed-in LisTix user.</span>}
    </div>
    {connection.connected && connection.avatarUrl && <img className="discord-avatar" src={connection.avatarUrl} alt="Discord avatar" />}
    <div className="discord-connection-actions">
      {connection.connected
        ? <button className="secondary-button" type="button" disabled={busy === "disconnect"} onClick={() => void disconnect()}>{busy === "disconnect" ? "Disconnecting..." : "Disconnect"}</button>
        : <button className="discord-button" type="button" disabled={!configured || loading || busy === "connect"} onClick={() => void connect()}>{busy === "connect" ? "Opening Discord..." : "Connect Discord"}</button>}
    </div>
    {!configured && <p className="error-message discord-connection-message">Discord environment variables are missing on the backend.</p>}
    {connectedMessage && !error && <p className="success-message discord-connection-message">{connectedMessage}</p>}
    {error && <p className="error-message discord-connection-message">{error}</p>}
  </div>;
}
