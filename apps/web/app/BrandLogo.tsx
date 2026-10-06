import {
  BRAND_LOGO_PATH,
  BRAND_NAME,
  BRAND_SUBTITLE,
  BRAND_WORDMARK,
} from "./brand";

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  subtitle?: string;
}

export default function BrandLogo({
  className = "",
  showText = true,
  subtitle = BRAND_SUBTITLE,
}: BrandLogoProps): React.ReactElement {
  const classes = ["replica-brand-lockup", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      <img
        alt={showText ? "" : BRAND_NAME}
        className="replica-brand-image"
        height="64"
        src={BRAND_LOGO_PATH}
        width="64"
      />
      {showText ? (
        <span className="replica-brand-copy">
          <strong>{BRAND_WORDMARK}</strong>
          <small>{subtitle}</small>
        </span>
      ) : null}
    </span>
  );
}
