import { Work_Sans } from "next/font/google";
import { AdminDashboard } from "@/app/admin/admin-dashboard";

export const metadata = {
  title: "Admin Dashboard",
};

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

export default function AdminPage() {
  return <AdminDashboard fontClassName={workSans.variable} />;
}
