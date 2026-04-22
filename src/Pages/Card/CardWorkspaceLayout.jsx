function CardWorkspaceLayout({
  topControls,
  periodControls,
  productSection,
  salesSection,
  mobileSidebar,
  mobileFloatingAction,
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-3 md:grid-cols-2">{topControls}</div>

      {mobileSidebar ? (
        <div className="sticky top-20 z-30 lg:hidden">{mobileSidebar}</div>
      ) : null}

      <div className="space-y-3">
        {periodControls}
        {productSection}
        {salesSection}
      </div>

      {mobileFloatingAction}
    </div>
  );
}

export default CardWorkspaceLayout;
