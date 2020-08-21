export const preloadTemplates = async function() {
  const templatePaths = [
    "modules/downtime-ethck/templates/partials/ability.html",
    "modules/downtime-ethck/templates/partials/simple.html",
    "modules/downtime-ethck/templates/partials/dc.html",
    "modules/downtime-ethck/templates/partials/complex.html"
  ];
  return loadTemplates(templatePaths);
};
