import { DWTForm } from "./downtime.js";

export class GMConfig extends FormApplication {
  constructor(...args) {
    super(...args);
    game.users.apps.push(this);
    this.activities = game.settings.get("downtime-ethck", "activities");
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = "Add a Global Downtime Event";
    options.id = "downtime-ethck";
    options.template = "modules/downtime-ethck/templates/gmConfig.html";
    options.closeOnSubmit = false;
    options.popOut = true;
    options.width = 600;
    options.height = "auto";
    return options;
  }

  async getData() {
    const activities = this.activities;
    return {
      activities,
    };
  }

  render(force, context = {}) {
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);
    for (let row of this.element.find(
      "#rollableEventsTable > tbody > .rollableEvent"
    )) {
      $(row)
        .find("#deleteRollable")
        .click((event) => this.handleRollableDelete(event, row));
    }
    this.element
      .find(".addWorldDowntime")
      .click((event) => this.addWorldDowntime(event));
    this.element
      .find(".training-edit")
      .click((event) => this.editWorldDowntime(event));

    this.element.find(".import").click((event) => this.importActivities(event));
    this.element.find(".export").click((event) => this.exportActivities(event));

    this.element.find(".activity-move").click((event) => this.moveWorldDowntime(event));
  }

  importActivities(event){
    const input = $('<input type="file">')
    input.on("change", this.importWorldActivities);
    input.trigger('click');
  }

  importWorldActivities() {
    const file = this.files[0];
    if (!file) return;

    readTextFromFile(file).then(async result => {
      let settings = JSON.parse(JSON.parse(result).value);
      // Ensure that linked objects are rebound if imported into another world
      for (let activity of settings){
        // If a table with the same id exists, skip
        let table = game.tables.get(activity.complication.table.id);
        if (!table){
          // Is there a table with the same name?
          table = game.tables.getName(activity.complication.table.name);
          if (table) {
            // If so, change id to reflect that.
            activity.complication.table.id = getProperty(table, "_id");
          }
        }
      }
      game.settings.set("downtime-ethck", "activities", settings)
    });
  }

  exportActivities(event){
    const data = game.data.settings.find((setting) => setting.key === "downtime-ethck.activities");
    const jsonData = JSON.stringify(data, null, 2);
    saveDataToFile(jsonData, 'application/json', "downtime-ethck-world-activities.json");
    ui.notifications.info("Ethck's Downtime: Saved Activity Data.")
  }

  async _updateObject(event, formData) {
    return;
  }
}
