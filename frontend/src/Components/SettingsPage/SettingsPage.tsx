import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useApi } from "../../Context/ApiContext";
import { hasPermission } from "../../Functions/hasPermission";
import type { NotificationChannel, ProfileSettings, UserNotificationEvent, UserNotificationPreferences } from "../../types";
import { FormField } from "../FormField/FormField";
import { DiscordConnectionCard } from "../DiscordConnectionCard/DiscordConnectionCard";
import { TeamSettings } from "../TeamSettings/TeamSettings";
import "./SettingsPage.css";

type SettingsForm = ProfileSettings & { displayName: string };
const notificationEvents: Array<{ key: UserNotificationEvent; label: string; required: NotificationChannel[] }> = [
  { key: "new_sale", label: "New sale", required: ["email"] },
  { key: "transfer_reminder", label: "Transfer required (deadline approaching)", required: ["email"] },
  { key: "retransfer", label: "Re-transfer", required: ["email", "discord"] },
  { key: "payout_sent", label: "Payout sent", required: ["email"] },
  { key: "listing_deleted", label: "Listing deleted", required: [] },
  { key: "sale_sent", label: "Sale sent", required: [] },
];
const channels: NotificationChannel[] = ["email", "discord", "pushover"];
const buildNotificationDefaults = (input?: Partial<UserNotificationPreferences>): UserNotificationPreferences => Object.fromEntries(notificationEvents.map((event) => [
  event.key,
  Object.fromEntries(channels.map((channel) => [channel, event.required.includes(channel) || input?.[event.key]?.[channel] === true])),
])) as UserNotificationPreferences;
const defaults: ProfileSettings = { discordHandle: "", discordUserId: "", addressLine1: "", addressLine2: "", postalCode: "", city: "", country: "", payoutMethod: "Bank transfer", payoutAccountHolder: "", payoutIban: "", payoutBic: "", payoutBankName: "", revolutRevtag: "", paymentCardBrand: "Visa", paymentCardNumber: "", paymentCardCvv: "", paymentCardExpiryMonth: "01", paymentCardExpiryYear: String(new Date().getFullYear()), paymentCardLast4: "", paymentCardExpiry: "", pushoverUserKey: "", sheetsGoogleAccount: "", sheetsDocumentUrl: "", sheetsConfirmationMode: "discord-confirmation", tikeyConnected: false, ticketmasterAccountsCsv: "", axsAccountsCsv: "", notificationPreferences: buildNotificationDefaults() };

function SettingsSection({ id, title, description, children, saving, onSave }: { id: string; title: string; description: string; children: ReactNode; saving: string; onSave: (title: string) => Promise<void> }) {
  return <section id={id} className="panel page-panel settings-section"><div className="page-header"><div><h2>{title}</h2><p>{description}</p></div><button className="secondary-button" type="button" disabled={Boolean(saving)} onClick={() => void onSave(title)}>{saving === title ? "Saving..." : "Save"}</button></div><div className="settings-fields">{children}</div></section>;
}

export function SettingsPage() {
  const { user, updateMe } = useApi(); const location = useLocation();
  if (!user) return null;
  const buildForm = (): SettingsForm => ({ displayName: user.displayName, ...defaults, ...user.profileSettings, notificationPreferences: buildNotificationDefaults(user.profileSettings.notificationPreferences) });
  const [form, setForm] = useState<SettingsForm>(buildForm); const [saving, setSaving] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => setForm(buildForm()), [user]);
  useEffect(() => { if (!location.hash) return; requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" })); }, [location.hash]);
  const update = (name: string, value: string | boolean) => setForm((current) => ({ ...current, [name]: value }));
  const updateNotification = (eventType: UserNotificationEvent, channel: NotificationChannel, enabled: boolean) => setForm((current) => ({
    ...current,
    notificationPreferences: {
      ...current.notificationPreferences,
      [eventType]: { ...current.notificationPreferences[eventType], [channel]: enabled },
    },
  }));
  const save = async (category: string) => { setSaving(category); setMessage(""); try { const { displayName, ...profileSettings } = form; await updateMe({ displayName: displayName.trim(), profileSettings }); setMessage(category === "all" ? "All settings saved." : `${category} settings saved.`); } catch (requestError) { setMessage(requestError instanceof Error ? requestError.message : "Unable to save settings."); } finally { setSaving(""); } };
  return <div className="settings-page page-stack">
    <SettingsSection id="settings-account" title="Account Details" description="Identity and contact information used throughout LisTix." saving={saving} onSave={save}><FormField label="Display name" name="displayName" value={form.displayName} onChange={update} /><FormField label="Address" name="addressLine1" value={form.addressLine1} onChange={update} /><FormField label="Address line 2" name="addressLine2" value={form.addressLine2} onChange={update} /><FormField label="Postal code" name="postalCode" value={form.postalCode} onChange={update} /><FormField label="City" name="city" value={form.city} onChange={update} /><FormField label="Country" name="country" value={form.country} onChange={update} /></SettingsSection>
    <SettingsSection id="settings-payment" title="Payment" description="Card used for inventory purchases." saving={saving} onSave={save}><FormField label="Card brand" name="paymentCardBrand" value={form.paymentCardBrand} options={["Visa", "MasterCard"]} onChange={update} /><FormField label="Card number" name="paymentCardNumber" value={form.paymentCardNumber} onChange={update} /><FormField label="CVV" name="paymentCardCvv" value={form.paymentCardCvv} type="password" onChange={update} /><FormField label="Expiry month" name="paymentCardExpiryMonth" value={form.paymentCardExpiryMonth} options={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))} onChange={update} /><FormField label="Expiry year" name="paymentCardExpiryYear" value={form.paymentCardExpiryYear} options={Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i))} onChange={update} /></SettingsSection>
    <SettingsSection id="settings-payout" title="Payout" description="Destination for marketplace payouts." saving={saving} onSave={save}><FormField label="Payout method" name="payoutMethod" value={form.payoutMethod} options={["Bank transfer", "Revolut"]} onChange={update} />{form.payoutMethod === "Revolut" ? <FormField label="Revtag" name="revolutRevtag" value={form.revolutRevtag} onChange={update} /> : <><FormField label="Account holder" name="payoutAccountHolder" value={form.payoutAccountHolder} onChange={update} /><FormField label="IBAN" name="payoutIban" value={form.payoutIban} onChange={update} /><FormField label="BIC" name="payoutBic" value={form.payoutBic} onChange={update} /><FormField label="Bank name" name="payoutBankName" value={form.payoutBankName} onChange={update} /></>}</SettingsSection>
    <SettingsSection id="settings-connections" title="Connections" description="External accounts and automated synchronization." saving={saving} onSave={save}><DiscordConnectionCard /><FormField label="Pushover user key" name="pushoverUserKey" value={form.pushoverUserKey} onChange={update} /><FormField label="Ticketmaster accounts CSV" name="ticketmasterAccountsCsv" value={form.ticketmasterAccountsCsv} type="url" onChange={update} /><FormField label="AXS accounts CSV" name="axsAccountsCsv" value={form.axsAccountsCsv} type="url" onChange={update} /><FormField label="Google account" name="sheetsGoogleAccount" value={form.sheetsGoogleAccount} type="email" onChange={update} /><FormField label="Google Sheets document" name="sheetsDocumentUrl" value={form.sheetsDocumentUrl} type="url" onChange={update} /><label className="toggle-field"><input type="checkbox" checked={form.tikeyConnected} onChange={(event) => update("tikeyConnected", event.target.checked)} /><span>Tikey connected</span></label></SettingsSection>
    <SettingsSection id="settings-notifications" title="Notifications" description="Choose where LisTix notifies you for each action. Required delivery channels stay enabled." saving={saving} onSave={save}><div className="notification-settings-table" role="table" aria-label="Notification preferences"><div className="notification-settings-header" role="row"><strong role="columnheader">Action</strong>{channels.map((channel) => <strong key={channel} role="columnheader">{channel}</strong>)}</div>{notificationEvents.map((notificationEvent) => <div className="notification-settings-row" role="row" key={notificationEvent.key}><span role="cell">{notificationEvent.label}</span>{channels.map((channel) => { const required = notificationEvent.required.includes(channel); const pushoverUnavailable = channel === "pushover" && !form.pushoverUserKey.trim(); const disabled = required || pushoverUnavailable; return <label role="cell" key={channel} title={pushoverUnavailable ? "Add a Pushover user key under Connections first." : required ? "This channel is required." : undefined}><input type="checkbox" checked={required || (!pushoverUnavailable && Boolean(form.notificationPreferences[notificationEvent.key]?.[channel]))} disabled={disabled} onChange={(event) => updateNotification(notificationEvent.key, channel, event.target.checked)} /><span>{required ? "Required" : pushoverUnavailable ? "Add key first" : "On"}</span></label>; })}</div>)}</div></SettingsSection>
    {hasPermission(user, "team.view") && <TeamSettings user={user} />}
    <div className="settings-actions">{message && <p className={message.includes("saved") ? "success-message" : "error-message"}>{message}</p>}<button className="primary-button" type="button" disabled={Boolean(saving)} onClick={() => void save("all")}>{saving === "all" ? "Saving all..." : "Save All"}</button></div>
  </div>;
}
