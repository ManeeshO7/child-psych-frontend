import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Website Disclaimer</h1>
          <div className="mt-6 border-t border-cream-200 pt-6">
            <p className="text-gray-600 leading-relaxed">
              All information provided on this website is for{" "}
              <strong>informational purposes only</strong> and does not constitute
              medical advice or establish a physician-patient relationship. Direct
              consultation with a qualified professional is required for diagnosis
              and treatment.
            </p>
          </div>
          <p className="mt-8">
            <Link href="/" className="text-warm-brown hover:underline">
              Back to Home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
