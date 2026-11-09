"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, GitFork, Star, X } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Select from "@/components/Select";
import RepositoryLanguage, { languageColor } from "@/components/RepositoryLanguage";
import type { ProjectPickOptions, ProjectShowcasePage, Repository } from "@/types/repository";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const control = "mobile-target min-h-11 min-w-0 border border-[#2B3A52] bg-[#1A2233] px-3 py-2 font-mono text-base text-[#9AA8C7] transition-colors enabled:cursor-pointer enabled:hover:border-[#62D6A7] enabled:hover:text-[#A2F0CF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62D6A7] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:text-xs";
const pageSize = 12;

type Account = { profile?: { id?: string; github?: string | null } | null } | null;

function languageSegments(repository: Repository) {
  const sorted = Object.entries(repository.languageBytes ?? {})
    .filter(([, bytes]) => Number.isFinite(bytes) && bytes > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (!total) return [];
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((sum, [, bytes]) => sum + bytes, 0);
  if (rest) top.push(["Other", rest]);
  return top.map(([name, bytes]) => ({ name, percent: (bytes / total) * 100, color: name === "Other" ? "#65748F" : languageColor(name) }));
}

function LanguageBreakdown({ repository }: { repository: Repository }) {
  const segments = languageSegments(repository);
  if (!segments.length) return <RepositoryLanguage language={repository.language} />;

  return (
    <div className="min-w-0">
      <div className="flex h-2 overflow-hidden bg-[#101722]" role="img" aria-label="Repository language breakdown">
        {segments.map(segment => <span key={segment.name} title={`${segment.name} ${Math.round(segment.percent)}%`} style={{ width: `${segment.percent}%`, backgroundColor: segment.color }} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {segments.map(segment => <span key={segment.name} className="inline-flex items-center gap-1 text-[11px] text-[#B7C4DA]">
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
          {segment.name} {Math.round(segment.percent)}%
        </span>)}
      </div>
    </div>
  );
}

export default function ProjectShowcase({ years, account, onMemberClick }: { years: number[]; account: Account; onMemberClick: (memberId: string) => void }) {
  const hasProfile = Boolean(account?.profile);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [year, setYear] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState("stars");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<ProjectShowcasePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const [pickerOptions, setPickerOptions] = useState<ProjectPickOptions | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), limit: String(pageSize), sort });
    if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
    if (year) query.set("year", year);
    if (language) query.set("language", language);
    setLoading(true);
    setError("");
    fetch(`${api}/api/repositories/showcase?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw Error(result.error || "Could not load the project showcase");
        return result as ProjectShowcasePage;
      })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load the project showcase"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [debouncedSearch, year, language, sort, page, reload]);

  const loadPickerOptions = useCallback(async () => {
    if (!hasProfile) return;
    setPickerLoading(true);
    setPickerError("");
    try {
      const response = await fetch(`${api}/api/repositories/showcase/picks`, { credentials: "include", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not load your repositories");
      const options = result as ProjectPickOptions;
      setPickerOptions(options);
      setSelectedIds(options.selectedRepositoryIds);
    } catch (reason) {
      setPickerError(reason instanceof Error ? reason.message : "Could not load your repositories");
    } finally {
      setPickerLoading(false);
    }
  }, [hasProfile]);

  useEffect(() => { void loadPickerOptions(); }, [loadPickerOptions]);

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerError("");
    if (!account) {
      setPickerError("Sign in with your IIITG account to feature a project.");
      return;
    }
    if (!account.profile) {
      setPickerError("Create or claim your profile before featuring a project.");
      return;
    }
    await loadPickerOptions();
  };

  const toggleProject = (id: string) => setSelectedIds(current => {
    if (current.includes(id)) return current.filter(value => value !== id);
    if (current.length >= 2) return current;
    return [...current, id];
  });

  const savePicks = async () => {
    setSaving(true);
    setPickerError("");
    try {
      const response = await fetch(`${api}/api/repositories/showcase/picks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryIds: selectedIds }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not save your picks");
      setPickerOptions(current => current ? { ...current, selectedRepositoryIds: result.selectedRepositoryIds } : current);
      setPickerOpen(false);
      setReload(value => value + 1);
    } catch (reason) {
      setPickerError(reason instanceof Error ? reason.message : "Could not save your picks");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8 font-mono text-[#9AA8C7] [&_button:not(:disabled)]:cursor-pointer">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-[#F1F5FF]">Project showcase by IIITG members</h2>
        <button type="button" onClick={() => void openPicker()} className="mobile-target min-h-11 shrink-0 cursor-pointer border border-[#62D6A7] bg-[#142D28] px-5 py-2.5 text-sm font-semibold text-[#A2F0CF] transition-colors hover:bg-[#1A3A31] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62D6A7]">
          {pickerOptions?.selectedRepositoryIds.length ? "Edit your picks" : "Add your Project"}
        </button>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <SearchBar className="!min-h-11 !py-2 sm:!min-h-0 sm:!text-xs col-span-2 w-full lg:col-span-1" value={search} onChange={value => { setSearch(value); setPage(1); }} />
        <Select ariaLabel="Project batch" value={year} onChange={value => { setYear(value); setPage(1); }} className={`${control} w-full`} options={[{ value: "", label: "All batches" }, ...[...years].sort((a,b)=>b-a).map(value => ({ value: String(value), label: String(value) }))]} />
        <Select ariaLabel="Project language" value={language} onChange={value => { setLanguage(value); setPage(1); }} className={`${control} w-full`} options={[{ value: "", label: "All languages" }, ...(data?.languages || []).map(value => ({ value, label: value }))]} />
        <Select ariaLabel="Project showcase sort" value={sort} onChange={value => { setSort(value); setPage(1); }} className={`${control} col-span-2 w-full lg:col-span-1`} options={[{ value: "stars", label: "Total stars" }, { value: "forks", label: "Total forks" }, { value: "pushed", label: "Recently pushed" }]} />
      </div>

      {error ? <p role="alert" className="mt-5 text-sm text-[#E0A35B]">{error}</p> : null}
      {loading && !data ? <p role="status" className="mt-6 text-sm">Loading project showcase...</p> : null}
      {data ? <>
        <p className="mt-5 text-xs">{data.total} members featuring projects</p>
        {!data.items.length && !loading ? <p className="mt-8 border border-[#2B3A52] bg-[#1A2233] p-8 text-center text-sm">No featured projects match these filters yet.</p> : null}
        <div className="mt-5 grid grid-cols-1 gap-5">
          {data.items.map(entry => <article key={entry.member.id} className="min-w-0 border border-[#34465F] bg-[#1A2233] p-5 shadow-lg shadow-black/10 sm:p-7">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#34465F] pb-4">
              <div className="flex min-w-0 items-center gap-3">
                {entry.member.github ? <Image unoptimized src={`https://github.com/${encodeURIComponent(entry.member.github)}.png?size=96`} alt="" width={48} height={48} className="size-12 shrink-0 rounded-full border border-[#40546E] object-cover" /> : <span className="flex size-12 shrink-0 items-center justify-center border border-[#40546E] bg-[#20314D] text-lg text-[#B8D6FF]">{entry.member.name.charAt(0).toUpperCase()}</span>}
                <div className="min-w-0">
                  <button type="button" className="block max-w-full cursor-pointer truncate text-left text-lg font-bold text-[#F1F5FF] hover:text-[#8BC5FF]" onClick={() => onMemberClick(entry.member.id)}>{entry.member.name}</button>
                  <p className="text-xs text-[#8593B2]">Batch {entry.member.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-[#D4DDF0]">
                <span className="inline-flex items-center gap-1.5"><Star size={15} aria-hidden className="text-[#FFD18A]" />{entry.stars.toLocaleString()} stars</span>
                <span className="inline-flex items-center gap-1.5"><GitFork size={15} aria-hidden />{entry.forks.toLocaleString()} forks</span>
              </div>
            </header>
            <div className="divide-y divide-[#34465F]">
              {entry.repositories.map(repository => <section key={repository.id} className="grid min-w-0 gap-4 py-5 md:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.8fr)] md:items-center">
                <div className="min-w-0">
                  <a href={repository.htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 break-all text-base font-semibold text-[#B8D6FF] hover:underline">
                    {repository.fullName}<ExternalLink size={14} aria-hidden className="shrink-0" />
                  </a>
                  <p className="mt-2 break-words text-sm leading-relaxed text-[#C3D0E7]">{repository.description || "No description provided."}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#B7C4DA]">
                    <span className="inline-flex items-center gap-1.5"><Star size={13} aria-hidden className="text-[#FFD18A]" />{repository.stars.toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1.5"><GitFork size={13} aria-hidden />{repository.forks.toLocaleString()}</span>
                    {repository.pushedAt ? <span>Updated {new Date(repository.pushedAt).toLocaleDateString()}</span> : null}
                    {repository.isArchived ? <span className="text-[#D7C381]">Archived</span> : null}
                  </div>
                </div>
                <LanguageBreakdown repository={repository} />
              </section>)}
            </div>
          </article>)}
        </div>
        {data.total > pageSize ? <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
          <button className={control} disabled={page===1} onClick={() => setPage(value => value - 1)}>Previous</button>
          <span>Page {page} of {Math.max(1, Math.ceil(data.total / pageSize))}</span>
          <button className={control} disabled={page*pageSize>=data.total} onClick={() => setPage(value => value + 1)}>Next</button>
        </div> : null}
      </> : null}

      {pickerOpen ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) setPickerOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="project-picker-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto border border-[#40546E] bg-[#1A2333] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><h3 id="project-picker-title" className="text-xl font-bold text-[#F1F5FF]">Choose your featured projects</h3><p className="mt-1 text-xs text-[#9AA8C7]">Select up to two original public repositories.</p></div>
            <button type="button" aria-label="Close project picker" className="mobile-target flex size-11 shrink-0 items-center justify-center border border-[#40546E] text-[#9AA8C7] hover:text-white" onClick={() => setPickerOpen(false)}><X size={17} aria-hidden /></button>
          </div>
          <p className="mt-4 text-xs text-[#8593B2]">{selectedIds.length} of 2 selected. Projects will appear in star order.</p>
          {pickerError ? <p role="alert" className="mt-4 border border-[#805044] bg-[#2D2022] p-3 text-sm text-[#FFB6A6]">{pickerError} {!account || !account.profile ? <Link href="/dashboard" className="ml-1 underline">Open your profile</Link> : null}</p> : null}
          {pickerLoading ? <p role="status" className="mt-5 text-sm">Loading your GitHub repositories...</p> : null}
          {!pickerLoading && pickerOptions && pickerOptions.repositories.length === 0 ? <div className="mt-5 border border-[#34465F] bg-[#121826] p-4 text-sm text-[#B7C4DA]">
            {pickerOptions.syncStatus === "empty" ? "Add your GitHub username to your profile to choose projects." : ["pending", "refreshing"].includes(pickerOptions.syncStatus) ? "Your GitHub repository list is still syncing. Try again shortly." : "No original repositories have synced yet. Refresh the community repository list, then try again."}
            <button type="button" className="ml-2 text-[#8BC5FF] underline" onClick={() => void loadPickerOptions()}>Try again</button>
          </div> : null}
          <div className="mt-4 divide-y divide-[#34465F] border-y border-[#34465F]">
            {pickerOptions?.repositories.map(repository => {
              const checked = selectedIds.includes(repository.id);
              const limitReached = selectedIds.length >= 2 && !checked;
              return <label key={repository.id} className={`flex min-w-0 cursor-pointer items-start gap-3 py-4 ${limitReached ? "cursor-not-allowed opacity-45" : ""}`}>
                <input type="checkbox" checked={checked} disabled={limitReached} onChange={() => toggleProject(repository.id)} className="mt-1 size-4 shrink-0 accent-[#62D6A7]" />
                <span className="min-w-0 flex-1">
                  <span className="block break-all font-semibold text-[#D4DDF0]">{repository.fullName}</span>
                  <span className="mt-1 block break-words text-xs text-[#9AA8C7]">{repository.description || "No description provided."}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8593B2]">
                    <RepositoryLanguage language={repository.language} />
                    <span className="inline-flex items-center gap-1"><Star size={11} aria-hidden className="text-[#FFD18A]" />{repository.stars}</span>
                    <span className="inline-flex items-center gap-1"><GitFork size={11} aria-hidden />{repository.forks}</span>
                  </span>
                </span>
              </label>;
            })}
          </div>
          <div className="mt-5 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length || saving} className="min-h-11 text-left text-xs text-[#9AA8C7] underline disabled:opacity-40">Clear picks</button>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPickerOpen(false)} disabled={saving} className="mobile-target min-h-11 border border-[#40546E] px-4 py-2 text-sm text-[#B7C4DA]">Cancel</button>
              <button type="button" onClick={() => void savePicks()} disabled={saving || pickerLoading || !account?.profile} className="mobile-target min-h-11 border border-[#62D6A7] bg-[#142D28] px-4 py-2 text-sm font-semibold text-[#A2F0CF] disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving..." : "Save picks"}</button>
            </div>
          </div>
        </section>
      </div> : null}
    </div>
  );
}
