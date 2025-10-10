import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* Left / Top panel with brand */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-black px-8 py-12 lg:px-12">
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-3"
            aria-label="Go to homepage"
          >
            <Image
              src="/akkodis_logo_small.svg"
              alt="Akkodis logo"
              width={48}
              height={48}
              className="relative z-20 h-10 w-10 shrink-0 rounded-md border border-white/20 bg-white/95 p-1 shadow-xl backdrop-blur transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-semibold tracking-tight text-white">
              Akkodis AI
            </span>
          </Link>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            Welcome to your intelligent document workspace
          </h1>
          <p className="mt-4 max-w-sm text-pretty text-base text-white/85 md:text-lg">
            Search, chat, and reason over your knowledge base with
            enterprise‑grade retrieval augmented generation.
          </p>
          <ul className="mt-6 grid w-full gap-3 text-left text-sm text-white/75 [list-style:circle] pl-5">
            <li>Secure authentication powered by Supabase</li>
            <li>Fast semantic search across documents</li>
            <li>Citations for every answer</li>
          </ul>
        </div>
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/5 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-blue-300/8 blur-3xl"></div>
      </div>

      {/* Right / Bottom panel with form */}
      <div className="flex w-full flex-1 items-center justify-center bg-background px-6 py-10 md:px-10">
        <div className="w-full max-w-sm lg:max-w-md">{children}</div>
      </div>
    </div>
  );
}
