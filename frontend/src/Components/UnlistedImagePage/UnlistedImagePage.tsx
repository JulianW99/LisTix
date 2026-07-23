import { useEffect } from "react";
import "./UnlistedImagePage.css";

interface UnlistedImagePageProps {
  alt: string;
  src: string;
  title: string;
}

export function UnlistedImagePage({ alt, src, title }: UnlistedImagePageProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const robotsMeta = document.createElement("meta");

    document.title = title;
    robotsMeta.name = "robots";
    robotsMeta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(robotsMeta);

    return () => {
      document.title = previousTitle;
      robotsMeta.remove();
    };
  }, [title]);

  return <main className="unlisted-image-page">
    <img src={src} alt={alt} />
  </main>;
}
