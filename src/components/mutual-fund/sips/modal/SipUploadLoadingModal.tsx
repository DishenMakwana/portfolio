import type { SipUploadLoadingModalProps } from "@/types/sips";

export default function SipUploadLoadingModal({
  isOpen,
}: SipUploadLoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-14 h-14 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-100">Parsing SIP file…</h3>
        <p className="text-slate-400 mt-2 text-sm">
          Reading monthly mandate amounts for all investors.
        </p>
      </div>
    </div>
  );
}
