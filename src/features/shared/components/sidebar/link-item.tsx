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
      className={`relative flex items-center gap-3 py-2 px-0 justify-center transition-all duration-200 text-black hover:bg-muted group-hover:px-3 group-hover:justify-start ${active ? "border-primary/40 bg-primary/10" : "border-transparent hover:bg-muted"}`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-0.5 transition-colors ${active ? "bg-primary" : "bg-transparent"}`}
      />
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="hidden group-hover:inline whitespace-nowrap">{label}</span>
    </Link>
  );
}
