import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Privacy Policy</h1>
          <p className="mt-4 text-gray-600">
            Your privacy is important to us. This page will be updated with our full privacy policy. Health information is handled in accordance with HIPAA and stored securely.
          </p>
          <p className="mt-4">
            <a href="/" className="text-warm-brown hover:underline">Back to Home</a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
