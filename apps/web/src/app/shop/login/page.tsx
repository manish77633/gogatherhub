import { AuthPreview } from "@/features/buyer/components/buyer-pages";
export default async function LoginPage({ searchParams }: PageProps<"/shop/login">) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" && /^\/(shop|seller|admin)(\/|$)/.test(params.next) && !params.next.includes("\\") ? params.next : undefined;
  return (
    <main className="ggh-page">
      <div className="ggh-page-container">
        <AuthPreview mode="login" nextPath={nextPath} authError={typeof params.error === "string" ? params.error : undefined} />
      </div>
    </main>
  );
}
