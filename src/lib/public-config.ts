const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TERMS_VERSION = "2026-07-15";
export const TERMS_EFFECTIVE_DATE_LABEL = "2026年7月15日";
export const CONTRIBUTION_POLICY = "site-only";

export function getPublicPolicyConfig() {
  const configuredEmail = process.env.CONTACT_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  const contactEmail =
    configuredEmail && emailPattern.test(configuredEmail) ? configuredEmail : "aidhide.support@gmail.com";
  const operatorName = process.env.OPERATOR_NAME?.trim() || "令和新漢語運営事務局";

  return {
    contactEmail,
    operatorName,
    dataLicense: CONTRIBUTION_POLICY,
    licenseLabel: "サイト内利用限定",
  };
}
