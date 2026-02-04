import IntakeForm from "@/components/IntakeForm";

export default function PatientIntakePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="section-heading">Clinical intake</h1>
      <p className="mt-2 text-gray-600">
        Please complete this form before your first appointment. You can save a draft and return later.
      </p>
      <div className="mt-8">
        <IntakeForm />
      </div>
    </main>
  );
}
