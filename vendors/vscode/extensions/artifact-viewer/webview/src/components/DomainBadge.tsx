interface DomainBadgeProps {
  domain: string;
}

function hashDomain(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const DOMAIN_HUES = [200, 160, 280, 30, 340, 120, 60, 220];

export function DomainBadge({ domain }: DomainBadgeProps) {
  const hue = DOMAIN_HUES[hashDomain(domain) % DOMAIN_HUES.length];

  return (
    <span
      className="av-badge"
      style={{
        backgroundColor: `hsla(${hue}, 50%, 50%, 0.15)`,
        color: `hsl(${hue}, 60%, 65%)`,
      }}
    >
      {domain}
    </span>
  );
}
