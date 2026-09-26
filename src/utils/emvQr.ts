// utils/emvQr.ts
import { decodeQrData } from "emvqr-parser";

export interface ParsedInstapayQr {
  countryCode?: string;
  city?: string;
  merchantName?: string;
  accountNumber?: string;
  swiftCode?: string;
  raw: any;
}

/**
 * Normalizes account or phone numbers extracted from QR sub-tags.
 */
function cleanAccountNumber(val: string | undefined): string | undefined {
  if (!val) return undefined;

  const cleaned = val.trim();

  // Ignore internal provider placeholders (e.g., 99964403 or short internal routing IDs)
  if (cleaned.startsWith("9996") || cleaned.length < 7) {
    return undefined;
  }

  return cleaned;
}

/**
 * Client-side parse for QR Ph / InstaPay EMV payload.
 * Recursively scans tags 26-51 to extract the account/mobile number and BIC.
 */
export function parseInstapayQr(rawQr: string): ParsedInstapayQr {
  const decoded = decodeQrData(rawQr);

  if (!decoded) {
    throw new Error("Invalid QR Code payload.");
  }

  let extractedAccount: string | undefined;
  let extractedSwift: string | undefined;

  // EMV Spec: Merchant Account Information is allocated across Tags 26 to 51
  for (let tagNum = 26; tagNum <= 51; tagNum++) {
    const tagKey = tagNum.toString().padStart(2, "0");
    const accountInfo = decoded[tagKey]?.data;

    if (!accountInfo || typeof accountInfo !== "object") continue;

    // IMPORTANT: sub-tag "00" is ALWAYS the template GUID (e.g. "com.p2pqrpay")
    // per the QR Ph / EMV spec — it identifies the scheme, never the
    // receiving institution's BIC. Do NOT read it as swiftCode.
    //
    // Sub-tag "01" holds the actual receiving BIC (e.g. "PAEYPHM2XXX"),
    // per PayMongo's own QR Ph transfer spec.
    if (!extractedSwift && accountInfo["01"]?.data) {
      const candidate = accountInfo["01"].data;
      // Guard against malformed payloads where "01" is itself a GUID-like
      // reverse-domain string instead of a BIC.
      if (typeof candidate === "string" && !candidate.startsWith("com.")) {
        extractedSwift = candidate;
      }
    }

    // Check common account number sub-tags (01, 02, 03, 04, 05, 26)
    const candidates = [
      accountInfo["04"]?.data,
      accountInfo["03"]?.data,
      accountInfo["02"]?.data,
      accountInfo["05"]?.data,
    ];

    for (const candidate of candidates) {
      const validNumber = cleanAccountNumber(candidate);
      if (validNumber) {
        extractedAccount = validNumber;
        break;
      }
    }

    if (extractedAccount) break;
  }

  return {
    countryCode: decoded["58"]?.data,
    city: decoded["60"]?.data,
    merchantName: decoded["59"]?.data,
    swiftCode: extractedSwift,
    accountNumber: extractedAccount,
    raw: decoded,
  };
}
