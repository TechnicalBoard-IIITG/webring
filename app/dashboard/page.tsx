"use client";

import { useEffect, useState, useCallback, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Code2, Eye, Image as ImageIcon, Link as LinkIcon, LoaderCircle, Lock, LogOut, Save, Tags, Trash2, Upload, User, X } from "lucide-react";
import { FaGithub, FaGoogle, FaLinkedin } from "react-icons/fa";
import { SiCodeforces, SiLeetcode } from "react-icons/si";
import MemberCard from "@/components/MemberCard";
import MemberDashboard from "@/components/MemberDashboard";
import { profilePreviewMember, profileValidationError } from "@/lib/profile-validation";
import type { Member } from "@/types/member";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type Profile = Member & { isPublic?: boolean };
type Account = { email: string; profile: Profile | null };
type Notice = { message: string; tone: "info" | "success" | "error" };
const empty: Profile = { name: "", year: new Date().getFullYear() + 3, github: "", portfolio: "", leetcode: "", codeforces: "", techStack: [], banner: "", bio: "", linkedin: "", isPublic: true };
const comparable = (p: Profile) => JSON.stringify([p.name, p.year, p.github || "", p.portfolio || "", p.leetcode || "", p.codeforces || "", p.linkedin || "", p.bio || "", p.techStack, p.isPublic ?? true]);
const fieldStyle = "mobile-input w-full min-w-0 border border-[#34465F] bg-[#121826] px-3 py-3 text-base text-[#F1F5FF] sm:text-sm outline-none transition-colors placeholder:text-[#637391] hover:border-[#526784] focus:border-[#5B8CFF] focus:ring-1 focus:ring-[#5B8CFF]";
const labelStyle = "mb-2 flex items-center gap-2 text-xs font-medium text-[#C3D0E7]";
const buttonStyle = "mobile-target inline-flex min-h-11 cursor-pointer sm:min-h-10 items-center justify-center gap-2 border border-[#34465F] px-3 py-2 text-xs text-[#C3D0E7] transition-colors enabled:hover:border-[#5B8CFF] enabled:hover:bg-[#20314D] enabled:hover:text-[#8BC5FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8CFF] disabled:cursor-not-allowed disabled:opacity-40";

function ProfileSection({ id, number, title, description, icon, children }: { id: string; number: string; title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 border border-[#2B3A52] bg-[#1A2233]">
    <header className="flex items-start gap-3 border-b border-[#2B3A52] px-4 py-4 sm:px-6">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center border border-[#34465F] bg-[#121826] text-[#8BC5FF]">{icon}</span>
      <div className="min-w-0 flex-1"><h2 id={`${id}-title`} className="text-sm font-semibold text-[#F1F5FF]">{title}</h2><p className="mt-1 text-xs leading-relaxed text-[#9AA8C7]">{description}</p></div>
      <span aria-hidden className="pt-1 text-[10px] text-[#637391]">{number}</span>
    </header>
    <div className="min-w-0 p-4 sm:p-6">{children}</div>
  </section>;
}

export default function EditProfile() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile>(empty);
  const [stack, setStack] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerAction, setBannerAction] = useState<"upload" | "remove" | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [saved, setSaved] = useState("");
  const [preview, setPreview] = useState(false);
  const dirty = Boolean(saved && saved !== comparable(profile));
  const previewMember = profilePreviewMember(profile);
  const tags = profile.techStack || [];
  const canAddTag = Boolean(stack.trim()) && tags.length < 40 && !tags.some(tag => tag.toLowerCase() === stack.trim().toLowerCase());

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${api}/api/auth/me`, { credentials: "include", cache: "no-store" });
      if (response.status === 401) { setAccount(null); return; }
      if (!response.ok) throw Error(`Could not load your account (${response.status}).`);
      const data: Account = await response.json();
      const draft = data.profile ? { ...empty, ...data.profile, techStack: data.profile.techStack || [] } : empty;
      setAccount(data); setProfile(draft); setSaved(comparable(draft));
      if (!data.profile) setNotice({ tone: "info", message: "Complete your details to join the directory. If you already have a profile that is missing here, ask an admin to check your account match before creating another." });
    } catch (error) { setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  const change = (field: keyof Profile, value: unknown) => setProfile(current => ({ ...current, [field]: value }));
  const addTag = () => { if (canAddTag) { change("techStack", [...tags, stack.trim()]); setStack(""); } };

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      const invalid = profileValidationError(profile); if (invalid) throw Error(invalid);
      const payload = { name: profile.name, year: Number(profile.year), github: profile.github || null, portfolio: profile.portfolio || null, leetcode: profile.leetcode || null, codeforces: profile.codeforces || null, techStack: profile.techStack, bio: profile.bio || null, linkedin: profile.linkedin || null, isPublic: profile.isPublic ?? true };
      const response = await fetch(`${api}/api/profile${account?.profile ? "/me" : ""}`, { method: account?.profile ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ? `${data.error}${data.issues ? ": " + JSON.stringify(data.issues) : ""}` : `Save failed (${response.status})`);
      setAccount(current => current ? { ...current, profile: data } : current);
      setProfile(current => ({ ...current, ...data })); setSaved(comparable(data));
      setNotice({ tone: "success", message: "Your profile has been saved." });
    } catch (error) { setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) }); }
    finally { setSaving(false); }
  };

  const updateBanner = (banner: string | null) => {
    change("banner", banner);
    setAccount(current => current?.profile ? { ...current, profile: { ...current.profile, banner: banner || undefined } } : current);
  };
  const clearBanner = async () => {
    setBannerAction("remove"); setNotice(null);
    try {
      const response = await fetch(`${api}/api/banners/me`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw Error("Could not remove the banner. Please try again.");
      updateBanner(null); setNotice({ tone: "success", message: "Custom banner removed. Your default profile banner is restored." });
    } catch (error) { setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) }); }
    finally { setBannerAction(null); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !["image/gif", "image/png", "image/jpeg", "image/webp"].includes(file.type)) { setNotice({ tone: "error", message: "Choose a GIF, PNG, JPEG or WebP image up to 5 MB." }); return; }
    setBannerAction("upload"); setNotice(null);
    try {
      const body = new FormData(); body.append("banner", file);
      const response = await fetch(`${api}/api/banners/me`, { method: "POST", credentials: "include", body });
      const data = await response.json(); if (!response.ok) throw Error(data.error || "Upload failed");
      updateBanner(data.banner); setNotice({ tone: "success", message: "Your banner image has been uploaded and saved." });
    } catch (error) { setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) }); }
    finally { setBannerAction(null); }
  };
  const signOut = async () => {
    setSigningOut(true);
    try {
      const response = await fetch(`${api}/api/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw Error("Could not sign out. Please try again.");
      router.push("/"); router.refresh();
    } catch (error) { setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) }); setSigningOut(false); }
  };

  return <main className="relative min-h-screen bg-[#121826] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] font-mono text-[#F1F5FF] sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] sm:py-12">
    <div aria-hidden className="pointer-events-none fixed inset-0 bg-grid" />
    <div className="relative mx-auto max-w-5xl">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#9AA8C7] transition-colors hover:text-[#8BC5FF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B8CFF]"><ArrowLeft size={14} aria-hidden /> Back to IIITG Index</Link>
      <header className="mt-8 flex flex-col items-start justify-between gap-5 sm:flex-row border-b border-[#2B3A52] pb-7">
        <div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your <span className="text-[#8BC5FF]">Profile</span></h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-[#9AA8C7]">Your place in the directory. Update your details, links, and profile banner.</p></div>
        {account && <div className="flex w-full gap-3 sm:w-auto"><button type="button" onClick={()=>setPreview(true)} className={`${buttonStyle} flex-1 sm:flex-none lg:hidden`}><Eye size={14} aria-hidden/>Preview profile</button><button type="button" onClick={() => void signOut()} disabled={signingOut || saving || Boolean(bannerAction)} className={`${buttonStyle} flex-1 sm:flex-none`}><LogOut size={14} aria-hidden />{signingOut ? "Signing out..." : "Sign out"}</button></div>}
      </header>

      {notice && <div role={notice.tone === "error" ? "alert" : "status"} className={`mt-5 flex items-start gap-3 border px-4 py-3 text-xs leading-relaxed ${notice.tone === "error" ? "border-[#805044] bg-[#2D2022] text-[#FFB6A6]" : notice.tone === "success" ? "border-[#386653] bg-[#142D28] text-[#A2F0CF]" : "border-[#34465F] bg-[#1A2233] text-[#B8D6FF]"}`}>
        {notice.tone === "success" && <Check size={15} aria-hidden className="mt-0.5 shrink-0" />}<p className="min-w-0 [overflow-wrap:anywhere]">{notice.message}</p>
      </div>}

      {loading ? <div role="status" className="mt-8 flex items-center gap-3 border border-[#2B3A52] bg-[#1A2233] p-6 text-sm text-[#9AA8C7]"><LoaderCircle size={17} aria-hidden className="animate-spin motion-reduce:animate-none" /> Loading your profile...</div> : !account ? (
        <section className="mt-8 max-w-xl border border-[#2B3A52] bg-[#1A2233] p-6 sm:p-8">
          <span aria-hidden className="mb-5 flex size-11 items-center justify-center border border-[#34465F] bg-[#20314D] text-[#8BC5FF]"><User size={20} /></span>
          <h2 className="text-lg font-semibold">Make yourself at home.</h2><p className="mt-3 text-sm leading-relaxed text-[#9AA8C7]">Sign in with your verified @iiitg.ac.in Google account to edit your profile.</p>
          <a href={`${api}/api/auth/google`} className="mt-6 inline-flex min-h-11 items-center gap-3 border border-[#5B8CFF] bg-[#20314D] px-5 py-3 text-sm text-[#B8D6FF] transition-colors hover:bg-[#2A4167] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B8CFF]"><FaGoogle size={15} aria-hidden />Continue with Google</a>
        </section>
      ) : (
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <form onSubmit={save} className="min-w-0 space-y-5">
            <ProfileSection id="identity" number="01" title="Identity" description="How you appear to the community." icon={<User size={16} />}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label><span className={labelStyle}>Display name</span><input autoComplete="name" className={fieldStyle} value={profile.name} maxLength={100} required onChange={event => change("name", event.target.value)} placeholder="Your name" /></label>
                <label><span className={labelStyle}>Graduation year</span><input className={fieldStyle} type="number" min="2000" max="2200" required value={profile.year || ""} onChange={event => change("year", Number(event.target.value))} /></label>
                <label className="sm:col-span-2"><span className={labelStyle}>Verified email <Lock size={11} aria-hidden className="text-[#6E7F9E]" /></span><input className={`${fieldStyle} cursor-default text-[#9AA8C7]`} value={account.email} readOnly aria-describedby="verified-email-help" /><span id="verified-email-help" className="mt-2 block text-[11px] text-[#8593B2]">Linked to your Google account. This field cannot be edited.</span></label>
                <label className="sm:col-span-2"><span className={`${labelStyle} justify-between`}>Bio <span className="text-[10px] font-normal text-[#8593B2]">{(profile.bio || "").length}/500</span></span><textarea className={`${fieldStyle} resize-y`} maxLength={500} rows={3} value={profile.bio || ""} onChange={event => change("bio", event.target.value)} placeholder="A little about you (optional)" /></label>
              </div>
            </ProfileSection>

            <ProfileSection id="coding-platforms" number="02" title="Coding platforms" description="Add usernames, not full URLs. Leave a field blank to remove its link." icon={<Code2 size={16} />}>
              <div className="grid gap-5 sm:grid-cols-3">
                {([{ key: "github", label: "GitHub username", Icon: FaGithub, color: "#8BC5FF" }, { key: "leetcode", label: "LeetCode username", Icon: SiLeetcode, color: "#FFD18A" }, { key: "codeforces", label: "Codeforces handle", Icon: SiCodeforces, color: "#F29B9B" }] as const).map(({ key, label, Icon, color }) => <label key={key}><span className={labelStyle}><Icon size={13} aria-hidden style={{ color }} />{label}</span><input autoCapitalize="none" autoCorrect="off" spellCheck={false} className={fieldStyle} maxLength={100} value={profile[key] || ""} onChange={event => change(key, event.target.value)} placeholder="username" /></label>)}
              </div>
            </ProfileSection>

            <ProfileSection id="social-links" number="03" title="Social links" description="Share where people can find you. Both links are optional." icon={<LinkIcon size={16} />}>
              <div className="grid gap-5">
                <label><span className={labelStyle}><LinkIcon size={13} aria-hidden className="text-[#A2F0CF]" />Portfolio URL</span><input type="url" autoCapitalize="none" spellCheck={false} className={fieldStyle} maxLength={500} value={profile.portfolio || ""} onChange={event => change("portfolio", event.target.value)} placeholder="https://your-site.dev" /></label>
                <label><span className={labelStyle}><FaLinkedin size={13} aria-hidden className="text-[#8CDEFF]" />LinkedIn URL</span><input type="url" autoCapitalize="none" spellCheck={false} className={fieldStyle} maxLength={500} value={profile.linkedin || ""} onChange={event => change("linkedin", event.target.value)} placeholder="https://www.linkedin.com/in/your-name" /></label>
              </div>
            </ProfileSection>

            <ProfileSection id="tech-stack" number="04" title="Tech stack" description="The tools and languages you want to share on your profile." icon={<Tags size={16} />}>
              <div className="mb-4 flex min-h-9 flex-wrap items-start gap-2">
                {tags.length ? tags.map(tag => <button type="button" key={tag} aria-label={`Remove ${tag}`} onClick={() => change("techStack", tags.filter(value => value !== tag))} className="mobile-target inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 border border-[#405B80] bg-[#20314D] px-2.5 py-1.5 text-xs text-[#B8D6FF] transition-colors hover:border-[#8BC5FF] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8BC5FF] sm:min-h-0"><span className="min-w-0 [overflow-wrap:anywhere]">{tag}</span><X size={11} aria-hidden className="shrink-0" /></button>) : <p className="py-2 text-xs text-[#8593B2]">No technologies added yet.</p>}
              </div>
              <label htmlFor="tech-input" className={`${labelStyle} justify-between`}>Add a technology <span className="text-[10px] font-normal text-[#8593B2]">{tags.length}/40</span></label>
              <div className="flex gap-2"><input id="tech-input" maxLength={60} className={fieldStyle} value={stack} onChange={event => setStack(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder="e.g. React" disabled={tags.length >= 40} /><button type="button" disabled={!canAddTag} onClick={addTag} className={buttonStyle}>Add</button></div>
              <p className="mt-2 text-[11px] text-[#8593B2]">Press Enter to add. Select a tag to remove it.</p>
            </ProfileSection>

            <ProfileSection id="banner-image" number="05" title="Banner image" description="The image across the top of your profile popup." icon={<ImageIcon size={16} />}>
              {profile.banner ? <div role="img" aria-label="Your current banner image" className="mb-4 h-36 border border-[#34465F] bg-[#121826] bg-cover bg-center sm:h-44" style={{ backgroundImage: `url(${profile.banner})` }} /> : <div className="mb-4 flex h-36 flex-col items-center justify-center gap-2 border border-dashed border-[#40546E] bg-[#121826] px-4 text-center sm:h-44"><ImageIcon size={24} aria-hidden className="text-[#637391]" /><p className="text-xs text-[#C3D0E7]">Default profile banner</p><p className="text-[11px] leading-relaxed text-[#8593B2]">Upload an image to replace the default background.</p></div>}
              <div className="flex flex-wrap gap-3">
                <label className={`${buttonStyle} ${!account.profile || bannerAction || saving ? "cursor-not-allowed opacity-40" : "hover:border-[#5B8CFF] hover:bg-[#20314D] hover:text-[#8BC5FF]"} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#5B8CFF]`}>
                  {bannerAction === "upload" ? <LoaderCircle size={14} aria-hidden className="animate-spin motion-reduce:animate-none" /> : <Upload size={14} aria-hidden />}{bannerAction === "upload" ? "Uploading..." : profile.banner ? "Replace banner image" : "Choose banner image"}
                  <input className="sr-only" type="file" aria-label="Choose banner image" accept="image/gif,image/png,image/webp,image/jpeg" disabled={!account.profile || Boolean(bannerAction) || saving} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void upload(file); }} />
                </label>
                {profile.banner && <button type="button" onClick={() => void clearBanner()} disabled={Boolean(bannerAction) || saving} className={buttonStyle}>{bannerAction === "remove" ? <LoaderCircle size={14} aria-hidden className="animate-spin motion-reduce:animate-none" /> : <Trash2 size={14} aria-hidden />}{bannerAction === "remove" ? "Removing..." : "Remove image"}</button>}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#9AA8C7]">GIF, PNG, JPEG or WebP / up to 5 MB. Animated GIFs are supported.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8593B2]">{account.profile ? "Banner changes are saved immediately." : "Create your profile before uploading a banner image."}</p>
            </ProfileSection>

            <label className="flex cursor-pointer items-start gap-3 border border-[#2B3A52] bg-[#1A2233] p-5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#5B8CFF]">
              <input className="peer sr-only" type="checkbox" checked={profile.isPublic ?? true} onChange={event => change("isPublic", event.target.checked)} />
              <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center border border-[#526784] bg-[#121826] text-transparent peer-checked:border-[#5B8CFF] peer-checked:bg-[#5B8CFF] peer-checked:text-[#121826]"><Check size={12} strokeWidth={3} /></span>
              <span><span className="block text-sm text-[#D4DDF0]">Show my profile in the directory</span><span className="mt-1 block text-xs leading-relaxed text-[#8593B2]">Your profile and published links are visible to everyone when enabled.</span></span>
            </label>

            <div className="relative z-10 flex flex-wrap sm:sticky sm:bottom-4 items-center justify-between gap-4 border border-[#40546E] bg-[#1A2233] p-4">
              <p role="status" className="flex items-center gap-2 text-xs text-[#9AA8C7]"><span aria-hidden className={`size-1.5 ${dirty ? "bg-[#FFD18A]" : "bg-[#62D6A7]"}`} />{saving ? "Saving your profile..." : dirty ? "Unsaved changes" : account.profile ? "All changes saved" : "Ready when you are"}</p>
              <button type="submit" disabled={saving || Boolean(bannerAction) || (Boolean(account.profile) && !dirty)} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 border border-[#5B8CFF] sm:w-auto bg-[#20314D] px-5 py-2.5 text-sm font-semibold text-[#B8D6FF] transition-colors enabled:hover:bg-[#2A4167] enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8BC5FF] disabled:cursor-not-allowed disabled:opacity-40">{saving ? <LoaderCircle size={15} aria-hidden className="animate-spin motion-reduce:animate-none" /> : <Save size={15} aria-hidden />}{saving ? "Saving..." : account.profile ? "Save changes" : "Create my profile"}</button>
              {notice && notice.tone !== "info" && <p aria-hidden className={`min-w-0 max-w-full basis-full break-words border-t border-[#34465F] pt-3 text-xs leading-relaxed [overflow-wrap:anywhere] ${notice.tone === "error" ? "text-[#FFB6A6]" : "text-[#A2F0CF]"}`}>{notice.message}</p>}
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <section aria-labelledby="preview-title" className="border border-[#2B3A52] bg-[#1A2233] p-5">
              <h2 id="preview-title" className="mb-1 flex items-center gap-2 text-sm font-semibold"><Eye size={15} aria-hidden className="text-[#8BC5FF]" />Live preview</h2><p className="mb-5 text-[11px] leading-relaxed text-[#8593B2]">Your directory card, as you edit.</p>
              <div className="mx-auto w-44"><MemberCard member={previewMember} onClick={() => setPreview(true)} /></div>
              <button type="button" onClick={() => setPreview(true)} className={`${buttonStyle} mt-4 w-full`}><Eye size={13} aria-hidden />Open profile preview</button>
            </section>
            <p className="px-1 text-[11px] leading-relaxed text-[#8593B2]">Your verified email stays private. Only the details you publish appear in the directory.</p>
          </aside>
          {preview && <MemberDashboard key={profile.banner} member={previewMember} onClose={() => setPreview(false)} />}
        </div>
      )}
    </div>
  </main>;
}
