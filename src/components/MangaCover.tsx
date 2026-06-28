import { useState } from "react";

type MangaCoverProps = {
  url: string | null;
  alt: string;
};

/**
 * Exibe a capa de um mangá ou um placeholder bonito quando a imagem não
 * existe ou falha ao carregar.
 */
export function MangaCover({ url, alt }: MangaCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="cover-placeholder" aria-hidden="true">
        <span className="cover-placeholder__icon">📖</span>
        <span className="cover-placeholder__text">Sem capa</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
