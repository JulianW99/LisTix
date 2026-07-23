import { useEffect } from "react";
import "./UnlistedImagePage.css";

export function UnlistedImagePage() {
  useEffect(() => {
    const previousTitle = document.title;
    const robotsMeta = document.createElement("meta");

    document.title = "Julian Wehrig";
    robotsMeta.name = "robots";
    robotsMeta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(robotsMeta);

    return () => {
      document.title = previousTitle;
      robotsMeta.remove();
    };
  }, []);

  return <main className="unlisted-image-page">
    <img src="/branding/jw.png" alt="Julian Wehrig" />
  </main>;
}
