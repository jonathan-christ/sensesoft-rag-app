import Link from "next/link";
export function LinkItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex text-black items-center gap-3 px-3 py-2 hover:bg-muted ${active ? "bg-muted" : ""}`}
    >
      {/* Active indicator */}
      <span
        className={`absolute left-0 top-0 h-full w-0.5 ${active ? "bg-primary" : "bg-transparent"}`}
      />
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        {label}
      </span>
    </Link>
  );
}
