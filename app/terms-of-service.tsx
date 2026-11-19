import { LegalDocument } from "@/components/settings/LegalDocument";
import {
  TERMS_HIGHLIGHTS,
  TERMS_LEAD,
  TERMS_SECTIONS,
  TERMS_TITLE,
  TERMS_UPDATED,
  TERMS_VERSION,
} from "@/content/legal/terms";

export default function TermsOfServiceScreen() {
  return (
    <LegalDocument
      title={TERMS_TITLE}
      icon="Shield"
      lead={TERMS_LEAD}
      lastUpdated={TERMS_UPDATED}
      version={TERMS_VERSION}
      highlights={TERMS_HIGHLIGHTS}
      sections={TERMS_SECTIONS}
    />
  );
}
