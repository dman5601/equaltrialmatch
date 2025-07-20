// web/src/pages/studies/[id].tsx
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import React from 'react';

type Contact = {
  name: string;
  email: string;
  phone: string;
};

export interface StudyDetail {
  id: string;
  title: string;
  status: string;
  conditions: string[];
  sponsors: string[];
  eligibility: string;
  contacts: Contact[];
}

interface Props {
  study?: StudyDetail;
  error?: string;
}

const StudyPage: NextPage<Props> = ({ study, error }) => {
  if (error) {
    return (
      <main className="container mx-auto p-6">
        <div className="text-red-600">Error: {error}</div>
        <Link href="/" legacyBehavior>
          <a className="mt-6 inline-block text-blue-600">← Back to search</a>
        </Link>
      </main>
    );
  }

  if (!study) {
    return (
      <main className="container mx-auto p-6">
        <div>No study found.</div>
        <Link href="/" legacyBehavior>
          <a className="mt-4 inline-block text-blue-600">← Back to search</a>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">{study.title}</h1>
      <p><strong>Status:</strong> {study.status}</p>
      <p><strong>Conditions:</strong> {study.conditions.join(', ')}</p>
      <p><strong>Sponsors:</strong> {study.sponsors.join(', ')}</p>

      <h2 className="text-2xl mt-6 mb-2">Eligibility Criteria</h2>
      <div className="bg-gray-100 p-4 rounded whitespace-pre-wrap">
        {study.eligibility}
      </div>

      <h2 className="text-2xl mt-6 mb-2">Contacts</h2>
      <ul>
        {study.contacts.map((c, i) => (
          <li key={i} className="mb-4 border-b pb-2">
            <p className="font-semibold">{c.name}</p>
            <p>Email: <a className="text-blue-600" href={`mailto:${c.email}`}>{c.email}</a></p>
            <p>Phone: {c.phone}</p>
          </li>
        ))}
      </ul>

      <Link href="/" legacyBehavior>
        <a className="mt-6 inline-block text-blue-600">← Back to search</a>
      </Link>
    </main>
  );
};

export default StudyPage;

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const raw = params?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) {
    return { props: { error: 'Invalid study ID' } };
  }

  try {
    const res = await fetch(`https://clinicaltrials.gov/api/v2/studies/${id}`);
    if (!res.ok) {
      throw new Error(`ClinicalTrials.gov returned HTTP ${res.status}`);
    }
    const json = await res.json();

    const protocol = json.protocolSection || {};
    const nameMod = json.studyNameModule || {};

    const conditions: string[] =
      protocol.conditionsModule?.conditionList?.condition || [];
    const sponsors: string[] = protocol.sponsorsModule?.leadSponsor
      ? [protocol.sponsorsModule.leadSponsor.agencyName]
      : [];
    const eligibility: string =
      protocol.eligibilityModule?.eligibilityCriteria || '';

    // —— Updated contact parsing —— 
    const rawContacts = protocol.contactsLocationsModule
      ?.overallContactList
      ?.overallContact;
    const contacts: Contact[] = Array.isArray(rawContacts)
      ? (rawContacts as unknown[]).map((item) => {
          const c = item as Record<string, unknown>;
          const last = typeof c.lastName === 'string' ? c.lastName : '';
          const first = typeof c.firstName === 'string' ? c.firstName : '';
          const email = typeof c.emailAddress === 'string' ? c.emailAddress : '';
          const phone = typeof c.phone === 'string' ? c.phone : '';
          return {
            name: `${last}, ${first}`,
            email,
            phone,
          };
        })
      : [];

    const study: StudyDetail = {
      id,
      title:
        nameMod.officialTitle ||
        nameMod.briefTitle ||
        'No title available',
      status:
        protocol.statusModule?.overallStatus ||
        'Unknown status',
      conditions,
      sponsors,
      eligibility,
      contacts,
    };

    return { props: { study } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { props: { error: msg } };
  }
};
