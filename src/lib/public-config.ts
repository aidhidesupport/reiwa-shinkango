const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getPublicPolicyConfig() {
  const configuredEmail = process.env.CONTACT_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  const contactEmail =
    configuredEmail && emailPattern.test(configuredEmail) ? configuredEmail : "aidhide.support@gmail.com";
  const operatorName = process.env.OPERATOR_NAME?.trim() || "令和新漢語運営事務局";
  const dataLicense = process.env.DATA_LICENSE?.trim() || "site-only";
  const licenseLabel = dataLicense === "CC-BY-4.0"
    ? "CC BY 4.0"
    : dataLicense === "CC-BY-SA-4.0"
      ? "CC BY-SA 4.0"
      : "サイト内利用限定";

  return {
    contactEmail,
    operatorName,
    dataLicense,
    licenseLabel,
  };
}
