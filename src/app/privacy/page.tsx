import type { Metadata } from "next";
import { LegalDocument, P, List, type LegalSection } from "@/components/legal/legal-document";
import { APP_NAME, CONTACT_EMAIL, PRIVACY_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${APP_NAME} collects, uses, stores, and protects your data, including Google and Meta advertising data.`,
};

const sections: LegalSection[] = [
  {
    id: "about",
    title: `About ${APP_NAME}`,
    content: (
      <>
        <P>
          {APP_NAME} is a marketing analytics platform that connects your
          advertising and analytics accounts, syncs the underlying performance
          data into a unified workspace, and provides reporting and AI-assisted
          analysis on top of that data. This Privacy Policy explains what
          information we collect, how we use it, the third parties involved, and
          the choices and rights you have.
        </P>
        <P>
          This policy applies to the {APP_NAME} web application and related
          services. By creating an account or connecting a data source, you
          agree to the practices described here.
        </P>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    content: (
      <>
        <P>We collect the following categories of information:</P>
        <List
          items={[
            "Account information — your name, email address, and authentication identifiers when you sign up.",
            "Workspace data — workspace names, membership, roles, and settings you configure.",
            "Connected platform data — advertising, analytics, and commerce metrics retrieved from sources you explicitly authorize.",
            "Billing information — subscription plan and payment status (payment card details are handled by Stripe, not by us).",
            "Usage and diagnostic data — log events, feature usage, and error reports used to operate and improve the service.",
          ]}
        />
      </>
    ),
  },
  {
    id: "google-oauth",
    title: "Google OAuth Data",
    content: (
      <>
        <P>
          When you connect a Google account, we use Google OAuth 2.0 to obtain a
          scoped access token. We request only the read scopes required for the
          connector you enable, and we never receive or store your Google
          password. Tokens are encrypted at rest and used solely to retrieve the
          data you authorize.
        </P>
        <P>
          {APP_NAME}&apos;s use and transfer of information received from Google
          APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand underline underline-offset-2 hover:text-brand/80"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. You can revoke access at any
          time from your Google Account permissions page or by disconnecting the
          connector in {APP_NAME}.
        </P>
      </>
    ),
  },
  {
    id: "google-ads",
    title: "Google Ads API Usage",
    content: (
      <>
        <P>
          With your authorization, {APP_NAME} accesses the Google Ads API to read
          campaign, ad group, keyword, and performance reporting data for the ad
          accounts you select. This data is used to populate your dashboards,
          reports, and AI analysis within your workspace.
        </P>
        <List
          items={[
            "We request read-only reporting access; we do not create, edit, pause, or delete campaigns.",
            "Google Ads data is used only to provide the features you request and is never sold.",
            "Data is associated with your workspace and isolated from other customers.",
            "You may disconnect Google Ads at any time, which stops further data retrieval.",
          ]}
        />
      </>
    ),
  },
  {
    id: "meta-ads",
    title: "Meta Ads API Usage",
    content: (
      <>
        <P>
          When you connect Meta (Facebook and Instagram) advertising accounts,
          {" "}
          {APP_NAME} uses the Meta Marketing API with the read-only{" "}
          <code className="rounded bg-[hsl(var(--card-fill-strong))] px-1.5 py-0.5 font-mono text-[12px]">
            ads_read
          </code>{" "}
          scope to retrieve ad account insights you authorize. We do not publish,
          modify, or manage ads on your behalf.
        </P>
        <P>
          Use of Meta data complies with the Meta Platform Terms and Developer
          Policies. You can revoke access from your Meta account settings or by
          disconnecting the connector.
        </P>
      </>
    ),
  },
  {
    id: "google-sheets",
    title: "Google Sheets Integration",
    content: (
      <P>
        If you enable the Google Sheets integration, {APP_NAME} writes the
        synced datasets you configure to spreadsheets you authorize. Access is
        scoped to the spreadsheets used for export. We do not read unrelated
        files in your Google Drive, and you control which data is exported and
        when.
      </P>
    ),
  },
  {
    id: "stripe",
    title: "Stripe Payments",
    content: (
      <P>
        Subscription billing is processed by Stripe, Inc. Payment card details
        are entered directly with Stripe and are never stored on {APP_NAME}{" "}
        servers. We retain only non-sensitive billing metadata such as your plan,
        subscription status, and customer identifier needed to manage your
        account. Stripe&apos;s handling of payment data is governed by Stripe&apos;s
        own privacy policy.
      </P>
    ),
  },
  {
    id: "ai-processing",
    title: "AI Processing",
    content: (
      <>
        <P>
          {APP_NAME} provides AI-assisted analysis of your connected marketing
          data. When you use these features, relevant metrics and prompts may be
          processed by our AI providers to generate summaries, recommendations,
          and explanations.
        </P>
        <List
          items={[
            "AI features operate on the data already present in your workspace.",
            "We do not use your private workspace data to train third-party foundation models.",
            "AI output is advisory; it does not execute changes to your ad accounts.",
          ]}
        />
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <P>
        We use strictly necessary cookies for authentication and session
        management, and we may use privacy-respecting analytics to understand
        aggregate usage. We do not use advertising or cross-site tracking
        cookies. You can control cookies through your browser settings, though
        disabling essential cookies may prevent you from signing in.
      </P>
    ),
  },
  {
    id: "data-storage",
    title: "Data Storage",
    content: (
      <P>
        Your data is stored using Supabase (PostgreSQL) infrastructure with
        row-level security that isolates each workspace. Data is logically
        separated per customer and accessible only to authenticated members of
        the relevant workspace.
      </P>
    ),
  },
  {
    id: "encryption",
    title: "Encryption",
    content: (
      <P>
        Data is encrypted in transit using TLS and at rest using
        industry-standard encryption. OAuth tokens and other sensitive
        credentials are encrypted before storage and are never exposed to other
        customers or in client-side code.
      </P>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <>
        <P>
          We apply administrative, technical, and organizational safeguards to
          protect your information, including:
        </P>
        <List
          items={[
            "Row-level security and per-workspace access boundaries.",
            "Least-privilege OAuth scopes (read-only for advertising data).",
            "Encrypted credential storage and access logging.",
            "Regular dependency and platform updates.",
          ]}
        />
        <P>
          No method of transmission or storage is completely secure, but we work
          to protect your data and to promptly address any vulnerabilities we
          identify.
        </P>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "Data Retention",
    content: (
      <P>
        We retain your workspace and connected data for as long as your account
        remains active or as needed to provide the service. When you disconnect a
        connector, we stop retrieving new data from that source. When you delete
        your account or request deletion, we remove your personal data and
        synced datasets within 30 days, except where retention is required to
        comply with legal, accounting, or security obligations.
      </P>
    ),
  },
  {
    id: "third-party-services",
    title: "Third Party Services",
    content: (
      <>
        <P>
          We rely on the following sub-processors and service providers to
          operate {APP_NAME}:
        </P>
        <List
          items={[
            "Google (Google Ads API, Google OAuth, Google Sheets) — connected data sources you authorize.",
            "Meta Platforms (Marketing API) — connected advertising data you authorize.",
            "Supabase — authentication and database hosting.",
            "Stripe — subscription and payment processing.",
            "AI model providers — processing of in-workspace data for AI features.",
          ]}
        />
      </>
    ),
  },
  {
    id: "user-rights",
    title: "User Rights",
    content: (
      <>
        <P>
          Depending on your jurisdiction, you may have the right to access,
          correct, export, restrict, or delete your personal data, and to
          withdraw consent for processing. You can exercise many of these rights
          directly in the app by editing your profile, disconnecting connectors,
          or deleting your workspace.
        </P>
        <P>
          To make a formal request, contact us at{" "}
          <a
            href={`mailto:${PRIVACY_EMAIL}`}
            className="text-brand underline underline-offset-2 hover:text-brand/80"
          >
            {PRIVACY_EMAIL}
          </a>
          .
        </P>
      </>
    ),
  },
  {
    id: "delete-data",
    title: "Delete Data Requests",
    content: (
      <>
        <P>You can delete your data in two ways:</P>
        <List
          items={[
            "In-app — disconnect a connector to remove its synced data, or delete your workspace/account to remove all associated data.",
            `By request — email ${PRIVACY_EMAIL} with the subject "Delete My Data" from your account email address.`,
          ]}
        />
        <P>
          We process deletion requests within 30 days and confirm completion by
          email. Revoking access through Google or Meta also stops further data
          collection immediately.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <P>
          For privacy questions or requests, contact us at{" "}
          <a
            href={`mailto:${PRIVACY_EMAIL}`}
            className="text-brand underline underline-offset-2 hover:text-brand/80"
          >
            {PRIVACY_EMAIL}
          </a>
          . For general support, email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-brand underline underline-offset-2 hover:text-brand/80"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </P>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      intro={`This policy explains how ${APP_NAME} collects, uses, stores, and protects your information, including data accessed through Google and Meta advertising APIs.`}
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={sections}
    />
  );
}
