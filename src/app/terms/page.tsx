import type { Metadata } from "next";
import { LegalDocument, P, List, type LegalSection } from "@/components/legal/legal-document";
import { APP_NAME, CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms governing your use of ${APP_NAME}, including subscriptions, connectors, API usage, and platform compliance.`,
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    content: (
      <P>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of
        {" "}
        {APP_NAME}. By creating an account, connecting a data source, or otherwise
        using the service, you agree to be bound by these Terms and by our
        Privacy Policy. If you do not agree, do not use {APP_NAME}.
      </P>
    ),
  },
  {
    id: "accounts",
    title: "Accounts",
    content: (
      <>
        <P>
          You are responsible for the accuracy of the information you provide and
          for maintaining the security of your account credentials.
        </P>
        <List
          items={[
            "You must be at least 18 years old and able to form a binding contract.",
            "You are responsible for all activity that occurs under your account.",
            "Notify us promptly of any unauthorized use or security breach.",
          ]}
        />
      </>
    ),
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    content: (
      <P>
        {APP_NAME} is offered on subscription plans. Paid plans renew
        automatically each billing period unless cancelled before the renewal
        date. Plan limits — such as the number of connectors and workspaces —
        are described at the time of purchase and may be updated with notice.
      </P>
    ),
  },
  {
    id: "workspace",
    title: "Workspace",
    content: (
      <P>
        A workspace is the container for your connected data, members, and
        settings. You are responsible for managing membership and roles within
        your workspaces and for ensuring that members you invite are authorized
        to access the connected data.
      </P>
    ),
  },
  {
    id: "ai-content",
    title: "AI Generated Content",
    content: (
      <>
        <P>
          {APP_NAME} provides AI-assisted summaries, recommendations, and
          analysis based on your connected data. This output is advisory and
          provided &quot;as is.&quot;
        </P>
        <List
          items={[
            "AI output may contain errors and should be reviewed before acting on it.",
            "AI features do not execute changes to your advertising accounts.",
            "You are responsible for decisions you make based on AI output.",
          ]}
        />
      </>
    ),
  },
  {
    id: "connectors",
    title: "Connectors",
    content: (
      <P>
        Connectors retrieve data from third-party platforms you authorize. You
        represent that you have the right to connect those accounts and to grant
        {" "}
        {APP_NAME} access to the associated data. Your use of each connected
        platform remains subject to that platform&apos;s own terms.
      </P>
    ),
  },
  {
    id: "api-usage",
    title: "API Usage",
    content: (
      <P>
        {APP_NAME} accesses third-party APIs using read-only scopes to retrieve
        the data required for the features you enable. You agree not to use the
        service to exceed, circumvent, or abuse the rate limits or usage policies
        of any connected platform.
      </P>
    ),
  },
  {
    id: "google-compliance",
    title: "Google Compliance",
    content: (
      <>
        <P>
          Your use of Google-connected features is additionally subject to
          Google&apos;s applicable terms, including the Google Ads API Terms and
          the Google API Services User Data Policy.
        </P>
        <List
          items={[
            "Google Ads data is accessed read-only and used only for in-workspace reporting and analysis.",
            "We do not create, modify, or manage Google Ads campaigns.",
            "We do not sell Google user data or use it for advertising.",
            "You may revoke Google access at any time.",
          ]}
        />
      </>
    ),
  },
  {
    id: "meta-compliance",
    title: "Meta Compliance",
    content: (
      <P>
        Your use of Meta-connected features is subject to the Meta Platform Terms
        and Developer Policies. {APP_NAME} accesses Meta advertising insights
        read-only and does not publish or manage ads on your behalf. You may
        revoke Meta access at any time.
      </P>
    ),
  },
  {
    id: "payments",
    title: "Payments",
    content: (
      <P>
        Payments are processed by Stripe. By subscribing, you authorize recurring
        charges to your selected payment method for the applicable plan and
        billing period. You are responsible for keeping your payment information
        current. Taxes may apply based on your location.
      </P>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    content: (
      <P>
        Subscription fees are billed in advance and are generally
        non-refundable, except where required by law. You may cancel at any time;
        cancellation stops future renewals, and you retain access through the end
        of the current billing period. If you believe you were charged in error,
        contact us and we will review the request in good faith.
      </P>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    content: (
      <P>
        You may stop using {APP_NAME} and delete your account at any time. We may
        suspend or terminate access if you violate these Terms, abuse the
        service, or create risk for {APP_NAME} or its users. Upon termination,
        your right to use the service ends and we handle your data as described in
        the Privacy Policy.
      </P>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    content: (
      <P>
        Our collection and use of your information is described in our{" "}
        <a
          href="/privacy"
          className="text-brand underline underline-offset-2 hover:text-brand/80"
        >
          Privacy Policy
        </a>
        , which is incorporated into these Terms by reference.
      </P>
    ),
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    content: (
      <P>
        To the maximum extent permitted by law, {APP_NAME} is provided &quot;as
        is&quot; without warranties of any kind, and {APP_NAME} and its suppliers
        will not be liable for indirect, incidental, special, consequential, or
        punitive damages, or for any loss of data, revenue, or profits arising
        from your use of the service. Our aggregate liability is limited to the
        amount you paid for the service in the twelve months preceding the claim.
      </P>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <P>
        Questions about these Terms can be sent to{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-brand underline underline-offset-2 hover:text-brand/80"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </P>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      intro={`These terms govern your use of ${APP_NAME}, including subscriptions, connectors, API usage, and platform compliance obligations.`}
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={sections}
    />
  );
}
