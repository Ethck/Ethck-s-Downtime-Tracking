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
    this.actor = game.actors.get(originalData.object._id);
    this.changes = this.actor.getFlag("downtime-ethck", "changes") || [];

    // Sort by time, newest to oldest
    //this.changes.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    let activities = new Set(this.changes.map((c) => c.activityName));

    return mergeObject(originalData, {
      isGM: game.user.isGM,
      changes: this.changes,
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
    html.find(".change-delete").click((event) => this.handleDelete(html, event));
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

  async handleDelete(html, event) {
    event.preventDefault();
    let del = false;

    let dialogContent = await renderTemplate(
        "modules/downtime-ethck/templates/delete-training-dialog.html"
      );

    new Dialog({
        title: `Delete Activity Entry`,
        content: dialogContent,
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label:"Delete",
            callback: () => (del = true),
          },
          no: {
            icon: "<i class='fas fa-times'></i>",
            label: "Cancel",
            callback: () => (del = false),
          },
        },
        default: "yes",
        close: async () => {
          if (del) {
            // Find our change index
            let fieldId = $(event.currentTarget).attr("id");
            let changeIdx = parseInt(fieldId.replace("ethck-delete-", ""));
            // Remove the change
            this.changes.splice(changeIdx, 1)
            // Update Actor
            this.actor.unsetFlag("downtime-ethck", "changes");
            await this.actor.setFlag("downtime-ethck", "changes", this.changes)
            // Update HTML
            $(html).find("#" + fieldId).parent().parent().remove();
            this.render();
          }
        },
      }).render(true);
  }
}
