import { Header } from "@/components/header";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header showMobileNav={false} />
      <main>{children}</main>
    </>
  );
}
