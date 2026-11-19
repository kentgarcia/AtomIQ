import { LegalDocument } from "@/components/settings/LegalDocument";
import {
  PRIVACY_HIGHLIGHTS,
  PRIVACY_LEAD,
  PRIVACY_SECTIONS,
  PRIVACY_TITLE,
  PRIVACY_UPDATED,
  PRIVACY_VERSION,
} from "@/content/legal/privacy";

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument
      title={PRIVACY_TITLE}
      icon="DocumentText"
      lead={PRIVACY_LEAD}
      lastUpdated={PRIVACY_UPDATED}
      version={PRIVACY_VERSION}
      highlights={PRIVACY_HIGHLIGHTS}
      sections={PRIVACY_SECTIONS}
    />
  );
}
