import { getSystemSettings } from "@/lib/settings";
import SettingsForm from "./SettingsForm";
import RegistrationForm from "./RegistrationForm";
import WhatsAppForm from "./WhatsAppForm";
import MinBalanceForm from "./MinBalanceForm";

export default async function AdminSettingsPage() {
  const settings = await getSystemSettings();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-brand-ink">הגדרות מערכת</h1>
      <MinBalanceForm value={settings.min_balance ?? 14} />
      <SettingsForm url={settings.clicksense_url ?? ""} enabled={settings.clicksense_enabled} />
      <RegistrationForm
        url={settings.registration_url ?? ""}
        enabled={settings.registration_enabled}
      />
      <WhatsAppForm
        number={settings.whatsapp_number ?? ""}
        message={settings.whatsapp_message ?? ""}
        enabled={settings.whatsapp_enabled}
      />
    </div>
  );
}
