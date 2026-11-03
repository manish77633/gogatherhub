import { AuthPreview } from "@/features/buyer/components/buyer-pages";
export default function RegisterPage() {
  return (
    <main className="ggh-page">
      <div className="ggh-page-container">
        <AuthPreview mode="register" />
      </div>
    </main>
  );
}
