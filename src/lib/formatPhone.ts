/** Format US phone number with +1 and (XXX) XXX-XXXX display. */
export function formatPhone(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const digits = value.replace(/\D/g, "");
  // 12 digits starting with 11: assume duplicate leading 1, use last 11
  if (digits.length === 12 && digits.startsWith("11")) {
    const d = digits.slice(1);
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}
