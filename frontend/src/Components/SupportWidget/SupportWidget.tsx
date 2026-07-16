import "./SupportWidget.css";

const discordSupportUrl = "https://discord.com/channels/1525988378162626690/1526274435932491797";

export function SupportWidget() {
  return (
    <a
      className="support-fab"
      href={discordSupportUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Open LisTix support on Discord"
      title="Open Discord support"
    >
      ?
    </a>
  );
}
