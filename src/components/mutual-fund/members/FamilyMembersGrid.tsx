import { motion } from "framer-motion";
import FamilyMemberCard from "./card/FamilyMemberCard";
import type { FamilyMembersGridProps } from "@/types/members";

export default function FamilyMembersGrid({
  memberSummaries,
  holdings,
  reportId,
  expandedMembers,
  onToggleDemat,
}: FamilyMembersGridProps) {
  return (
    <motion.div
      key="members"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {memberSummaries.map((member) => {
        const memberHoldings = holdings.filter(
          (h) => h.memberName === member.name && (h.balanceUnits ?? 0) > 0.0001
        );
        const schemesCount = memberHoldings.length;

        return (
          <FamilyMemberCard
            key={member.name}
            member={member}
            schemesCount={schemesCount}
            reportId={reportId}
            isExpanded={!!expandedMembers[member.name]}
            onToggleDemat={(e) => onToggleDemat(member.name, e)}
          />
        );
      })}
    </motion.div>
  );
}
