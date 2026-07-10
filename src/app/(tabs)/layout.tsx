import { BottomNav } from "@/components/BottomNav";

export default function TabsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="flex-1 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
