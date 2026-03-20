import { useEffect } from "react";

export default function PageMeta({ title }) {
  useEffect(() => {
    if (title) document.title = `${title} | MGN Admin`;
  }, [title]);
  return null;
}
