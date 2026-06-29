import { Metadata } from 'next';
import { Mail, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions | Ultrametrics',
  description: 'How users can request deletion of their data from Ultrametrics.',
  openGraph: {
    title: 'Data Deletion Instructions | Ultrametrics',
    description: 'How users can request deletion of their data from Ultrametrics.',
    type: 'website',
  },
};

export default function DataDeletionPage() {
  const deletionSteps = [
    'Sign in to Ultrametrics.',
    'Open Workspace Settings.',
    'Open Connected Accounts.',
    'Disconnect Meta Ads, Google Ads, Google Analytics or any connected platform.',
    'Save your changes.',
    'Contact our support team at ultrametrics.ai@gmail.com requesting permanent account and data deletion.',
    'Our team will permanently remove your account, connected OAuth tokens, synced marketing data, AI conversations, uploaded assets and workspace data after verification.',
  ];

  const deletedItems = [
    'Connected OAuth Tokens',
    'Marketing Data',
    'AI Conversations',
    'Generated Reports',
    'Campaign History',
    'Uploaded Assets',
    'Workspace Settings',
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
            Delete Your Data
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Ultrametrics respects your privacy. You can permanently delete your account, connected marketing platforms, and synced data at any time.
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl space-y-16">
          {/* Section 1: How to Delete */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8 flex items-center gap-2">
              <span className="h-1 w-1.5 bg-emerald-600 rounded-full"></span>
              How to delete your data
            </h2>
            <ol className="space-y-4 sm:space-y-5">
              {deletionSteps.map((step, index) => (
                <li key={index} className="flex gap-4 sm:gap-5">
                  <div className="flex-shrink-0">
                    <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm sm:text-base">
                      {index + 1}
                    </span>
                  </div>
                  <div className="pt-1">
                    <p className="text-base sm:text-lg text-slate-700">{step}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Section 2: What Will Be Deleted */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8 flex items-center gap-2">
              <span className="h-1 w-1.5 bg-emerald-600 rounded-full"></span>
              What will be deleted
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {deletedItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3 sm:gap-4">
                  <Check className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-base sm:text-lg text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Deletion Timeline */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="h-1 w-1.5 bg-emerald-600 rounded-full"></span>
              Deletion Timeline
            </h2>
            <div className="space-y-4 text-base sm:text-lg text-slate-700">
              <p>• Requests are reviewed within 24–48 hours.</p>
              <p>• Data is permanently deleted after identity verification.</p>
              <p>• OAuth tokens are revoked before deletion.</p>
              <p>• Deleted data cannot be recovered.</p>
            </div>
          </div>

          {/* Section 4: Need Help */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-8 sm:p-12 border border-emerald-200">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              Need help?
            </h2>
            <p className="text-slate-600 mb-6 text-base sm:text-lg">
              For account deletion, privacy requests, or assistance with removing your connected marketing platforms, please contact:
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              <Mail className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 flex-shrink-0" />
              <a
                href="mailto:ultrametrics.ai@gmail.com"
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-base sm:text-lg transition-colors"
              >
                ultrametrics.ai@gmail.com
              </a>
            </div>
            <p className="text-slate-500 mt-6 text-sm sm:text-base">
              We normally respond within 24–48 hours.
            </p>
          </div>
        </div>
      </section>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm text-slate-500">
            Ultrametrics complies with Meta Platform Terms and applicable privacy regulations regarding user data deletion.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-12 sm:px-6 lg:px-8 bg-slate-900 text-slate-100">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-lg sm:text-xl font-semibold mb-2">Ultrametrics</p>
          <p className="text-slate-400 text-base sm:text-lg">
            AI Marketing Operating System
          </p>
        </div>
      </footer>
    </main>
  );
}
