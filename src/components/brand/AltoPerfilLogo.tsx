/** Alto Perfil brand blue, sampled from the original logo. */
export const BRAND_BLUE = "#003399";

type Tone = "brand" | "white" | "black";
const FILL: Record<Tone, string> = { brand: BRAND_BLUE, white: "#ffffff", black: "#0a0a0a" };

interface Props {
  tone?: Tone;
  /** Hide the "STRATEGIC DATA ANALYTICS" line (small sizes). */
  tagline?: boolean;
  className?: string;
}

/**
 * Vector (HD) rebuild of the ALTO PERFIL wordmark. Proportions match the original
 * artwork; textLength locks each word's width so it renders identically everywhere.
 */
export function AltoPerfilLogo({ tone = "brand", tagline = true, className }: Props) {
  const fill = FILL[tone];
  return (
    <svg viewBox={tagline ? "-4 -4 1120 296" : "-4 -4 1120 200"} className={className} role="img" aria-label="Alto Perfil — Strategic Data Analytics">
      <g fill={fill}>
        <text x="0" y="188" fontFamily="'Montserrat', 'Century Gothic', sans-serif" fontWeight={500} fontSize="262" textLength="536" lengthAdjust="spacingAndGlyphs">ALTO</text>
        <text x="544" y="188" fontFamily="'Roboto Condensed', 'Arial Narrow', sans-serif" fontWeight={800} fontSize="264" textLength="572" lengthAdjust="spacingAndGlyphs">PERFIL</text>
        {tagline && (
          <text x="2" y="284" fontFamily="'Montserrat', sans-serif" fontWeight={500} fontSize="72" textLength="1110" lengthAdjust="spacing">STRATEGIC DATA ANALYTICS</text>
        )}
      </g>
    </svg>
  );
}
