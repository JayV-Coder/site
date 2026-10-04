import { NewPasswordForm } from "@/components/organisms/auth/NewPasswordForm";

export const metadata = { robots: { index: false } };

export default function NewPasswordPage() {
  return <main className="flex flex-1 flex-col"><NewPasswordForm /></main>;
}
