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

    // Sort by time, newest to oldest
    changes.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    let activities = new Set(changes.map((c) => c.activityName));

    return mergeObject(originalData, {
      isGm: game.user.isGM,
      changes: changes,
      activities: activities,
    });
  }

  // Called on submission, handle doing stuff.
  async _updateObject(event, formData) {
    return
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("#filterActivity").change((event) => this.filterChanges(html, event));
  }

  filterChanges(html, event) {
    event.preventDefault();
    // For every row
    html.find("tr > #activityName").each((i, target) => {
      let request = $(event.target).val();
      // Show all
      $(target).parent().show();
      // Hide if request val is not blank and activityName does not match requested activityName
      if (request !== "" && $(target).text().trim() !== request) {
        $(target).parent().hide();
      }
    })

  }
}
