interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  className = "",
}: SearchBarProps) {
  return (
    <input
      type="text"
      aria-label="Search members"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="search members..."
      className={`mobile-input min-h-14 min-w-0 border border-[#2B3A52] bg-[#1A2233] px-3 py-3 font-mono text-base text-[#9AA8C7] placeholder:text-[#7082A5] outline-none transition-colors duration-200 focus:border-[#5B8CFF] focus:shadow-[0_0_0_1px_#5B8CFF] sm:text-sm ${className}`}
    />
  );
}
