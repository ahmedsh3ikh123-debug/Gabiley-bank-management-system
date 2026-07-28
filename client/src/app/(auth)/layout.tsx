import type { Metadata } from "next";
import { AuthBackground } from "@/components/layout/auth-background";

export const metadata: Metadata = {
  title: "Gabiley Bank - Authentication",
  description: "Secure authentication for Gabiley Bank Management System",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AuthBackground />
      {children}
    </div>
  );
}
