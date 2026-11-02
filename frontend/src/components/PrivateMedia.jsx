import React, { useEffect, useState } from "react";
import { fetchFile } from "../api/client";

// A student's photo or video thumbnail. Their files aren't public, so it is fetched with the
// session token and shown from a temporary blob URL.
export default function PrivateMedia({ path, video, alt, style }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url = null;
    let live = true;
    fetchFile(path).then((blob) => {
      if (!live) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    }).catch(() => {});
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (!src) return <div style={style} aria-label={alt} />;
  return video
    ? <video src={src} muted preload="metadata" style={style} />
    : <img src={src} alt={alt} style={style} />;
}
