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
    options.closeOnSubmit = true;
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
  }

  editWorldDowntime(event) {
    // Edit Downtime Activity
    event.preventDefault();

    // Set up some variables
    let fieldId = event.currentTarget.id;
    let activity = game.settings
      .get("downtime-ethck", "activities")
      .find((act) => act.id === parseInt(fieldId));
    let form = new DWTForm({}, activity, true);
    form.render(true);
  }

  addWorldDowntime(event) {
    let form = new DWTForm();
    form.render(true);
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
      const settings = JSON.parse(result);
      game.settings.set("downtime-ethck", "activities", JSON.parse(settings.value))
    });

    //location.reload();
  }

  exportActivities(event){
    const data = game.data.settings.find((setting) => setting.key === "downtime-ethck.activities");
    const jsonData = JSON.stringify(data, null, 2);
    saveDataToFile(jsonData, 'application/json', "downtime-ethck-world-activities.json");
    ui.notifications.info("Ethck's Downtime: Saved Activity Data.")
  }

  async handleRollableDelete(event, row) {
    event.preventDefault();

    const toDel = this.activities.find((act) => act.id == $(row).attr("id"));
    const idx = this.activities.indexOf(toDel);
    this.activities.splice(idx, 1);

    await game.settings.set("downtime-ethck", "activities", this.activities);
    $(row).remove();
  }

  async _updateObject(event, formData) {
    return;
  }
}
