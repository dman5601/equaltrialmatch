// web/src/pages/api/studies/[nctId].ts
import type { NextApiRequest, NextApiResponse } from "next";

// adjust this to match exactly what your Trial type in TrialCard.tsx needs:
export type Trial = {
  nctId: string;
  briefTitle: string;
  // …any other fields your TrialCard expects…
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Trial | { error: string }>
) {
  const { nctId } = req.query;
  if (typeof nctId !== "string") {
    return res.status(400).json({ error: "Invalid NCTId" });
  }

  // fetch the study from clinicaltrials.gov
  const apiRes = await fetch(
    `https://clinicaltrials.gov/api/query/study_fields?expr=${nctId}&fields=NCTId,BriefTitle&fmt=json`
  );
  const data = await apiRes.json();
  const fields = data.StudyFieldsResponse.StudyFields[0];

  if (!fields) {
    return res.status(404).json({ error: "Study not found" });
  }

  return res.status(200).json({
    nctId: fields.NCTId[0],
    briefTitle: fields.BriefTitle[0] ?? "No title available",
    // …map other fields here as needed…
  });
}
