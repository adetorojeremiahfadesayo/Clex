/** Clexa is an original illustrated guide, not a legal adviser or chat agent. */
export function Clexa({ className = "", decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 280 300" xmlns="http://www.w3.org/2000/svg" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : "Clexa, the Clex guide"} aria-hidden={decorative ? true : undefined}>
      <ellipse cx="141" cy="280" rx="91" ry="12" fill="var(--color-forest-deep)" opacity=".13" />
      <g className="clexa-float">
        <path d="M72 79c0-31 25-56 56-56h54c18 0 30 10 43 24l18 22v122c0 43-30 72-75 72h-39c-44 0-73-29-73-72V96c0-9 7-17 16-17Z" fill="var(--color-mint)" stroke="var(--color-forest-deep)" strokeWidth="8" strokeLinejoin="round" />
        <path d="M181 24v37c0 13 9 21 22 21h39" fill="var(--color-paper)" stroke="var(--color-forest-deep)" strokeWidth="8" strokeLinejoin="round" />
        <path d="M89 127c14-13 33-20 55-20s42 7 56 20" fill="none" stroke="var(--color-forest-deep)" strokeWidth="7" strokeLinecap="round" opacity=".25" />
        <g className="clexa-eyes" fill="var(--color-forest-deep)"><ellipse cx="111" cy="155" rx="6" ry="10" /><ellipse cx="173" cy="155" rx="6" ry="10" /></g>
        <path d="M126 181c10 10 23 10 33 0" fill="none" stroke="var(--color-forest-deep)" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="87" cy="173" rx="11" ry="6" fill="var(--color-coral)" opacity=".7" /><ellipse cx="196" cy="173" rx="11" ry="6" fill="var(--color-coral)" opacity=".7" />
        <path d="M62 177c-23-11-38-8-41 4-4 14 13 25 35 27" fill="var(--color-mint)" stroke="var(--color-forest-deep)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <g className="clexa-wave"><path d="M227 178c18-18 35-23 43-12 8 12-1 28-26 43" fill="var(--color-mint)" stroke="var(--color-forest-deep)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /><path d="m260 155 8-10m-13 12-2-15" stroke="var(--color-forest-deep)" strokeWidth="5" strokeLinecap="round" /></g>
        <path d="M108 260v15m70-15v15" stroke="var(--color-forest-deep)" strokeWidth="10" strokeLinecap="round" />
        <path d="M93 276h33m36 0h33" stroke="var(--color-forest-deep)" strokeWidth="11" strokeLinecap="round" />
        <rect x="96" y="202" width="91" height="35" rx="17" fill="var(--color-surface)" stroke="var(--color-forest-deep)" strokeWidth="5" />
        <path d="m116 220 9 8 16-17" fill="none" stroke="var(--color-focus)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M151 217h20" stroke="var(--color-forest-deep)" strokeWidth="5" strokeLinecap="round" opacity=".45" />
      </g>
    </svg>
  );
}
