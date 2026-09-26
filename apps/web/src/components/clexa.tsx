import Image from "next/image";

/** Clexa is a friendly visual guide, not a legal adviser or chat agent. */
export function Clexa({ className = "", decorative = false }: { className?: string; decorative?: boolean }) {
  return <Image
    className={className}
    src="/mascots/clexa-barrister.png"
    width={1191}
    height={1320}
    sizes="(max-width: 540px) 105px, (max-width: 800px) 145px, 170px"
    alt={decorative ? "" : "Clexa, a cheerful chick wearing a barrister's wig"}
    aria-hidden={decorative ? true : undefined}
  />;
}
