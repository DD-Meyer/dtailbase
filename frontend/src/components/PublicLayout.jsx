import PublicShell from "./public/PublicShell";

export default function PublicLayout({ children, showNav = true, showFooter = true }) {
  return <PublicShell marketing showNav={showNav} showFooter={showFooter}>{children}</PublicShell>;
}
