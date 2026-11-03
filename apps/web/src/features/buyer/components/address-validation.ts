export const addressFields = ["fullName", "phone", "line1", "line2", "city", "state", "pincode"] as const;
export type AddressField = typeof addressFields[number];
export type AddressErrors = Partial<Record<AddressField, string>>;

export function validateAddress(values: Record<string, unknown>): AddressErrors {
  const text = (key: AddressField) => String(values[key] ?? "").trim();
  const errors: AddressErrors = {};
  if (!/^[\p{L}][\p{L}\p{M} .'-]{1,119}$/u.test(text("fullName"))) errors.fullName = "Enter a valid name (2–120 characters).";
  if (!/^[6-9]\d{9}$/.test(text("phone"))) errors.phone = "Enter a 10-digit Indian mobile number.";
  if (text("line1").length < 5 || text("line1").length > 200) errors.line1 = "Enter an address (5–200 characters).";
  if (text("line2").length > 200) errors.line2 = "Address line 2 is too long.";
  for (const field of ["city", "state"] as const) {
    if (text(field).length < 2 || text(field).length > 100 || !/^[\p{L}\p{M} .'-]+$/u.test(text(field))) errors[field] = `Enter a valid ${field}.`;
  }
  if (!/^[1-9]\d{5}$/.test(text("pincode"))) errors.pincode = "Enter a valid 6-digit PIN.";
  return errors;
}
