import { motion } from "framer-motion";
import { Mail, Phone, MapPin, ShieldCheck, User, Landmark } from "lucide-react";
import type { FamilyMemberDematDrawerProps } from "@/types/members";

export default function FamilyMemberDematDrawer({
  member,
}: FamilyMemberDematDrawerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-4 p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-4 text-xs overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Specs */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Account Specs
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-slate-300">
            {member.nsdlId && (
              <>
                <span className="text-slate-500">NSDL ID:</span>
                <span className="">{member.nsdlId}</span>
              </>
            )}
            <span className="text-slate-500">Broker:</span>
            <span className="font-semibold">{member.dpName}</span>
            <span className="text-slate-500">DP ID:</span>
            <span className="">{member.dpId}</span>
            <span className="text-slate-500">Client ID:</span>
            <span className="">{member.clientId}</span>
            {member.dob && (
              <>
                <span className="text-slate-500">DOB:</span>
                <span>{member.dob}</span>
              </>
            )}
            <span className="text-slate-500">BO Status:</span>
            <span>{member.boStatus}</span>
            <span className="text-slate-500">Sub-Status:</span>
            <span>{member.boSubStatus}</span>
            <span className="text-slate-500">BSDA:</span>
            <span className="font-bold text-teal-400">{member.bsda}</span>
            <span className="text-slate-500">RGESS:</span>
            <span>{member.rgess}</span>
          </div>
        </div>

        {/* Contacts & Nominee */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Nomination & Contacts
          </div>
          <div className="space-y-2 text-slate-300">
            <div className="flex items-start gap-2">
              <User size={13} className="text-teal-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="text-slate-500 min-w-16 shrink-0">
                  Nominee:
                </span>
                <span className="font-semibold text-slate-200 break-words">
                  {member.dematNominee}
                </span>
              </div>
            </div>
            {member.aadhaarStatus && (
              <div className="flex items-start gap-2">
                <ShieldCheck
                  size={13}
                  className="text-teal-400 shrink-0 mt-0.5"
                />
                <div className="min-w-0 flex-1 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="text-slate-500 min-w-16 shrink-0">
                    Aadhaar:
                  </span>
                  <span className="text-slate-200">{member.aadhaarStatus}</span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Mail size={13} className="text-teal-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="text-slate-500 min-w-16 shrink-0">Email:</span>
                <span className="text-slate-200 break-all select-all font-medium">
                  {member.email}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={13} className="text-teal-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="text-slate-500 min-w-16 shrink-0">
                  Mobile:
                </span>
                <span className="text-slate-200">{member.mobile}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck
                size={13}
                className="text-teal-400 shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="text-slate-500 min-w-16 shrink-0">
                  Status:
                </span>
                <span className="text-emerald-400 font-semibold">
                  {member.accountStatus} (Frozen: {member.frozenStatus})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Bank Details */}
      {(member.linkedBankName ||
        member.linkedBankIfsc ||
        member.linkedBankAccountNo) && (
        <div className="pt-3 border-t border-slate-900 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <Landmark size={11} className="text-teal-400" /> Linked Bank Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-slate-300 bg-slate-900/20 p-2.5 rounded border border-slate-900/50">
            {member.linkedBankName && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Bank:</span>
                <span className="font-semibold text-slate-200">
                  {member.linkedBankName}
                </span>
              </div>
            )}
            {member.linkedBankIfsc && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">IFSC:</span>
                <span className="text-slate-200">{member.linkedBankIfsc}</span>
              </div>
            )}
            {member.linkedBankAccountNo && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Acc No:</span>
                <span className="text-slate-200">
                  {member.linkedBankAccountNo}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address */}
      {member.address && (
        <div className="pt-3 border-t border-slate-900 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <MapPin size={10} className="text-teal-400" /> Correspondence
            Address
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px] font-medium bg-slate-900/20 p-2.5 rounded border border-slate-900/50">
            {member.address}
          </p>
        </div>
      )}
    </motion.div>
  );
}
