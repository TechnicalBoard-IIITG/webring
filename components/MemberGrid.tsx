import MemberCard from "./MemberCard";
import type { CodeforcesRatings } from "@/hooks/useCodeforcesRatings";
import { Member } from "@/types/member";

interface MemberGridProps {
  members: Member[];
  onMemberClick: (member: Member) => void;
  codeforcesRatings: CodeforcesRatings;
}

export default function MemberGrid({
  members,
  onMemberClick,
  codeforcesRatings,
}: MemberGridProps) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:flex sm:gap-6 sm:flex-wrap sm:[&>*]:w-48">
      {members.map((member) => (
        <MemberCard
          key={member.id || member.github || member.name}
          member={member}
          onClick={onMemberClick}
          codeforcesRating={
            member.codeforces
              ? codeforcesRatings[member.codeforces]
              : undefined
          }
        />
      ))}
    </div>
  );
}
