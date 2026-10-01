import { BASE_URL, ICON_PATH } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";

export const normalizeColor = (c?: string | null): string => {
  const v = (c ?? "").trim();
  if (!v) return "";
  return /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? `#${v}` : v;
};

const resolveLogo = (logo?: string | null): string | null => {
  if (!logo) return null;

  const fixed = logo.replace(
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/,
    BASE_URL,
  );

  return /^https?:\/\//.test(fixed) ? fixed : `${ICON_PATH}${fixed}`;
};

export const useCoopTheme = () => {
  const coop = useAuthStore((s) => s.cooperative);

  return {
    primary: normalizeColor(coop?.primary_color) || "#3E4093",
    secondary: normalizeColor(coop?.secondary_color) || "#64748b",
    logo: resolveLogo(coop?.logo),
  };
};
