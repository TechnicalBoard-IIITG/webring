const colors: Record<string, string> = {
  javascript: "#f1e05a",
  typescript: "#3178c6",
  python: "#3572A5",
  java: "#b07219",
  c: "#555555",
  "c++": "#f34b7d",
  "c#": "#178600",
  go: "#00ADD8",
  rust: "#dea584",
  ruby: "#701516",
  php: "#4F5D95",
  html: "#e34c26",
  css: "#663399",
  scss: "#c6538c",
  shell: "#89e051",
  powershell: "#012456",
  dart: "#00B4AB",
  kotlin: "#A97BFF",
  swift: "#F05138",
  vue: "#41b883",
  svelte: "#ff3e00",
  "jupyter notebook": "#DA5B0B",
  r: "#198CE7",
  lua: "#000080",
  scala: "#c22d40",
  dockerfile: "#384d54",
  makefile: "#427819",
  "objective-c": "#438eff",
  elixir: "#6e4a7e",
  haskell: "#5e5086",
  zig: "#ec915c",
};

export function languageColor(language:string|null){return colors[language?.trim().toLowerCase()||'']||'#9AA8C7'}

export default function RepositoryLanguage({ language }: { language: string | null }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full ring-1 ring-white/15"
        style={{ backgroundColor: languageColor(language) }}
      />
      <span className="min-w-0 truncate">{language || "Language unavailable"}</span>
    </span>
  );
}
