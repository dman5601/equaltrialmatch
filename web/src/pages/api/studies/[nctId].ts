// web/src/pages/api/studies/[nctId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

// Raw API response structures for strong typing
interface IdentificationModule {
  nctId?: string;
  briefTitle?: string;
}
interface StatusModule {
  overallStatus?: string;
  startDateStruct?: { date?: string };
  lastUpdatePostDateStruct?: { date?: string };
}
interface ConditionsModule {
  conditions?: string[];
}
interface RawLocation {
  facility?: string;
  city?: string;
  state?: string;
  country?: string;
}
interface ContactsLocationsModule {
  locations?: RawLocation[];
}
interface DesignModule {
  phases?: string[];
}
interface EligibilityModule {
  minimumAge?: string;
  maximumAge?: string;
  sex?: string;
}
interface APIResponse {
  protocolSection?: {
    identificationModule?: IdentificationModule;
    statusModule?: StatusModule;
    conditionsModule?: ConditionsModule;
    contactsLocationsModule?: ContactsLocationsModule;
    designModule?: DesignModule;
    eligibilityModule?: EligibilityModule;
  };
}

// Define a Location type for output
interface Location {
  facility: string;
  city: string;
  state: string;
  country: string;
}

export type Trial = {
  nctId: string;
  briefTitle: string;
  status: string;
  conditions: string[];
  locations: Location[];
  startDate: string;
  updated: string;
  phase: string[];
  ageRange: { min: string; max: string };
  gender: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Trial | { error: string }>
) {
  const { nctId } = req.query;
  if (typeof nctId !== "string") {
    return res.status(400).json({ error: "Invalid NCTId" });
  }

  try {
    const resp = await axios.get<APIResponse>(
      `https://clinicaltrials.gov/api/v2/studies/${nctId}`,
      {
        params: {
          fields: [
            "protocolSection.identificationModule.nctId",
            "protocolSection.identificationModule.briefTitle",
            "protocolSection.statusModule.overallStatus",
            "protocolSection.conditionsModule.conditions",
            "protocolSection.contactsLocationsModule.locations",
            "protocolSection.statusModule.startDateStruct.date",
            "protocolSection.statusModule.lastUpdatePostDateStruct.date",
            "protocolSection.designModule.phases",
            "protocolSection.eligibilityModule.minimumAge",
            "protocolSection.eligibilityModule.maximumAge",
            "protocolSection.eligibilityModule.sex"
          ].join(","),
        },
      }
    );

    const ps = resp.data.protocolSection ?? {};
    const idMod = ps.identificationModule ?? {};
    const statusMod = ps.statusModule ?? {};
    const condMod = ps.conditionsModule ?? {};
    const locMod = ps.contactsLocationsModule ?? {};
    const designMod = ps.designModule ?? {};
    const eligMod = ps.eligibilityModule ?? {};

    const trial: Trial = {
      nctId: idMod.nctId ?? nctId,
      briefTitle: idMod.briefTitle ?? "No title",
      status: statusMod.overallStatus ?? "",
      conditions: condMod.conditions ?? [],
      locations: (locMod.locations ?? []).map((l) => ({
        facility: l.facility ?? "",
        city: l.city ?? "",
        state: l.state ?? "",
        country: l.country ?? "",
      })),
      startDate: statusMod.startDateStruct?.date ?? "",
      updated: statusMod.lastUpdatePostDateStruct?.date ?? "",
      phase: designMod.phases ?? [],
      ageRange: { min: eligMod.minimumAge ?? "", max: eligMod.maximumAge ?? "" },
      gender: eligMod.sex ?? null,
    };

    return res.status(200).json(trial);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Study detail fetch error:", msg);
    return res.status(500).json({ error: "Failed to fetch study details" });
  }
}
