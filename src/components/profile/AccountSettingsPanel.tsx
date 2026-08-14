"use client";

import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import Input from "@/components/ui/Input";
import { authApi } from "@/lib/api";

interface Props {
  token: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  onNameSaved: (name: string) => void;
}

export default function AccountSettingsPanel({
  initialName,
  initialEmail,
  initialPhone,
  onNameSaved,
}: Props) {
  // Profile fields
  const [name, setName]   = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [profSaving, setProfSaving] = useState(false);
  const [profSaved, setProfSaved]   = useState(false);
  const [profError, setProfError]   = useState("");

  // Password fields
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew]       = useState(false);
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [pwdSaved, setPwdSaved]     = useState(false);
  const [pwdError, setPwdError]     = useState("");

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfError("");
    if (!name.trim()) { setProfError("Name is required"); return; }
    setProfSaving(true);
    try {
      await authApi.updateMe({ name: name.trim(), phone: phone.trim() || undefined });
      onNameSaved(name.trim());
      setProfSaved(true);
      setTimeout(() => setProfSaved(false), 2500);
    } catch (err) {
      setProfError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setProfSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (newPwd.length < 6) { setPwdError("Password must be at least 6 characters"); return; }
    if (newPwd !== confirmPwd) { setPwdError("Passwords do not match"); return; }
    setPwdSaving(true);
    try {
      await authApi.updateMe({ password: newPwd });
      setNewPwd(""); setConfirmPwd("");
      setPwdSaved(true);
      setTimeout(() => setPwdSaved(false), 2500);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Personal info */}
      <div className="bg-white border border-[#CDBBAD]/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#11100E] mb-4">Personal Information</h3>
        <form onSubmit={handleProfileSave} className="space-y-4 max-w-md">
          <Input label="Full Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
          <Input label="Email Address" type="email" value={initialEmail} disabled hint="Email cannot be changed" />
          <Input label="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
          {profError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{profError}</p>}
          <button
            type="submit"
            disabled={profSaving}
            className="bg-[#5D1C34] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {profSaved ? <><Check size={13} /> Saved</> : profSaving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-[#CDBBAD]/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#11100E] mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
          <Input
            label="New Password"
            type={showNew ? "text" : "password"}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="Min. 6 characters"
            required
            rightIcon={
              <button type="button" onClick={() => setShowNew((v) => !v)} className="pointer-events-auto">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="Re-enter new password"
            required
          />
          {pwdError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{pwdError}</p>}
          <button
            type="submit"
            disabled={pwdSaving}
            className="bg-[#5D1C34] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {pwdSaved ? <><Check size={13} /> Updated</> : pwdSaving ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
