// web/src/pages/api/studies/[nctId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

// Strongly-typed protocolSection modules
interface IdentificationModule { nctId?: string; briefTitle?: string; }
interface SponsorModule { agencyClass?: string; agencyName?: string; }
interface SponsorCollaboratorsModule { leadSponsor?: SponsorModule; }
interface StatusModule { overallStatus?: string; startDateStruct?: { date?: string }; lastUpdatePostDateStruct?: { date?: string }; }
interface ConditionsModule { conditions?: string[]; }
interface Intervention { interventionName?: string; }
interface InterventionsModule { interventionList?: Intervention[]; }
interface EligibilityModule { minimumAge?: string; maximumAge?: string; sex?: string; criteria?: string[]; }
interface ResultItem { title?: string; description?: string; }
interface ResultsSection { outcomeList?: ResultItem[]; }
interface Document { documentType?: string; documentURL?: string; documentCategory?: string; }
interface DocumentsModule { documentList?: Document[]; }
interface GeoPoint { latitude?: number; longitude?: number; }
interface Contact { facility?: string; city?: string; state?: string; country?: string; geoPoint?: GeoPoint; }
interface ContactsModule { locations?: Contact[]; }
interface DesignModule { phases?: string[]; }

// v2 single-study response shape
interface StudyResponse {
  protocolSection?: {
    identificationModule?: IdentificationModule;
    sponsorCollaboratorsModule?: SponsorCollaboratorsModule;
    statusModule?: StatusModule;
    conditionsModule?: ConditionsModule;
    interventionsModule?: InterventionsModule;
    eligibilityModule?: EligibilityModule;
    contactsLocationsModule?: ContactsModule;
    designModule?: DesignModule;
    resultsSection?: ResultsSection;
    documentsModule?: DocumentsModule;
  };
}

// Output Trial type including sponsor & geoPoints
export type Trial = {
  nctId: string;
  briefTitle: string;
  sponsor: string;
  status: string;
  conditions: string[];
  interventions: string[];
  eligibilityCriteria: string[];
  locations: Array<{ facility: string; city: string; state: string; country: string; geoPoint?: GeoPoint }>;
  startDate: string;
  updated: string;
  phase: string[];
  ageRange: { min: string; max: string };
  gender: string | null;
  outcomes: { title: string; description: string }[];
  documents: { type: string; url: string; category: string }[];
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
    // Fetch complete study details
    const resp = await axios.get<StudyResponse>(
      `https://clinicaltrials.gov/api/v2/studies/${nctId}`
    );

    const ps = resp.data.protocolSection || {};
    const idMod = ps.identificationModule || {};
    const sponsorMod = ps.sponsorCollaboratorsModule?.leadSponsor || {};
    const statusMod = ps.statusModule || {};
    const condMod = ps.conditionsModule || {};
    const intrMod = ps.interventionsModule || {};
    const eligMod = ps.eligibilityModule || {};
    const locMod = ps.contactsLocationsModule || {};
    const designMod = ps.designModule || {};
    const resMod = ps.resultsSection || {};
    const docMod = ps.documentsModule || {};

    const trial: Trial = {
      nctId: idMod.nctId || nctId,
      briefTitle: idMod.briefTitle || "No title",
      sponsor: sponsorMod.agencyName || "",
      status: statusMod.overallStatus || "",
      conditions: condMod.conditions || [],
      interventions: intrMod.interventionList?.map(i => i.interventionName || "") || [],
      eligibilityCriteria: eligMod.criteria || [],
      locations: locMod.locations?.map(l => ({
        facility: l.facility || "",
        city: l.city || "",
        state: l.state || "",
        country: l.country || "",
        geoPoint: l.geoPoint
      })) || [],
      startDate: statusMod.startDateStruct?.date || "",
      updated: statusMod.lastUpdatePostDateStruct?.date || "",
      phase: designMod.phases || [],
      ageRange: { min: eligMod.minimumAge || "", max: eligMod.maximumAge || "" },
      gender: eligMod.sex || null,
      outcomes: resMod.outcomeList?.map(o => ({ title: o.title || "", description: o.description || "" })) || [],
      documents: docMod.documentList?.map(d => ({ type: d.documentType || "", url: d.documentURL || "", category: d.documentCategory || "" })) || []
    };

    return res.status(200).json(trial);
  } catch (err: unknown) {
    console.error("Study detail fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch study details" });
  }
}
