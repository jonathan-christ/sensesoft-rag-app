import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* Left / Top panel with brand */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-muted/60 to-muted px-8 py-12 lg:px-12">
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-3"
            aria-label="Go to homepage"
          >
            {/* Using native img instead of next/image because the SVG embeds a very large base64 PNG internally; next/image was calculating an unexpected layout box. */}
            <img
              src="/akkodis_logo_small.svg"
              alt="Akkodis logo"
              width={48}
              height={48}
              className="relative z-20 h-10 w-10 shrink-0 rounded-md border border-border bg-white/80 p-1 shadow-sm backdrop-blur transition-transform group-hover:scale-105 dark:bg-white/90"
            />
            <span className="text-xl font-semibold tracking-tight">Akkodis AI</span>
          </Link>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Welcome to your intelligent document workspace
          </h1>
          <p className="mt-4 max-w-sm text-pretty text-base text-muted-foreground md:text-lg">
            Search, chat, and reason over your knowledge base with enterprise‑grade retrieval augmented generation.
          </p>
          <ul className="mt-6 grid w-full gap-3 text-left text-sm text-muted-foreground/90 [list-style:circle] pl-5">
            <li>Secure authentication powered by Supabase</li>
            <li>Fast semantic search across documents</li>
            <li>Citations for every answer</li>
          </ul>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 select-none opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent)]">
          <Image
            src="/akkodis_logo.svg"
            alt=""
            fill
            className="object-contain p-12"/>
        </div>
      </div>

      {/* Right / Bottom panel with form */}
      <div className="flex w-full flex-1 items-center justify-center bg-background px-6 py-10 md:px-10">
        <div className="w-full max-w-sm lg:max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
