export default class AuditLog extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "downtime-audit-log-form",
      template: "modules/downtime-ethck/templates/audit-dialog.html",
      title: "Activity Log",
      width: 900,
      resizable: true,
      closeOnSubmit: true,
    });
  }

  async getData(options = {}) {
    let originalData = super.getData();
    let changes = originalData.object.flags["downtime-ethck"].changes || [];
    let activitiesWorld = game.settings.get("downtime-ethck", "changes")[originalData.object._id];
    if (activitiesWorld !== undefined){
      changes.push(...activitiesWorld);
    }

    // Sort by time, newest to oldest
    changes.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return mergeObject(originalData, {
      isGm: game.user.isGM,
      changes: changes,
    });
  }

  // Called on submission, handle doing stuff.
  async _updateObject(event, formData) {
    return
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}
