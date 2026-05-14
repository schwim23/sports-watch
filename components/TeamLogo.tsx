import { teamLogoUrl } from "@/lib/teams/logo";

type TeamLike = {
  externalId: string;
  abbreviation: string;
  logoUrl?: string | null;
};

type Size = "sm" | "md" | "lg";

const PX: Record<Size, number> = { sm: 28, md: 40, lg: 64 };

export default function TeamLogo({
  team,
  size = "md",
  className,
}: {
  team: TeamLike;
  size?: Size;
  className?: string;
}) {
  const px = PX[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- MLB serves logos as remote SVGs sized at 28-64px; Next/Image optimization adds no value here.
    <img
      src={teamLogoUrl(team)}
      alt={`${team.abbreviation} logo`}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}
