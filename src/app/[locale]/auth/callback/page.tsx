import { Suspense } from "react";
import { Callback } from "@/components/organisms/auth/Callback";

export const metadata = { robots: { index: false } };

export default function CallbackPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense><Callback /></Suspense>
    </main>
  );
}
